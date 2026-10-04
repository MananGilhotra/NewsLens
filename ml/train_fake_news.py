"""
Train the NewsLens fake-news classifier.

Data
  * WELFake (Verma et al., 2021) - 72k news articles merged from Kaggle, McIntire, Reuters and BuzzFeed.
    In this copy label 1 = fake, 0 = real (verified: 99.9% of "(Reuters)" articles are label 0).
  * FakeNewsNet (Shu et al., 2018) - PolitiFact and GossipCop headlines, used so the model also
    handles short inputs such as a single headline.
  * CC-News (Hamborg et al., 2017) articles from outlets rated "generally reliable" in the
    News Media Reliability dataset (Burdisso et al., NAACL 2024). WELFake's real class is mostly
    Reuters wire copy, so without these the model learns Reuters house style instead of credibility.

Model
  TF-IDF over word uni+bigrams (sublinear tf, l2 norm) -> logistic regression.
  The weights are exported to JSON and served by the pure-JS implementation in
  backend/services/mlModel.js, so the backend needs no Python at runtime.

Honesty measures
  * Source artifacts that make WELFake trivially separable ("(Reuters)" datelines, "Featured image via",
    Getty credits, tweet embeds, URLs, handles) are stripped before training.
  * Exact duplicates are removed and every story (article + its headline) is kept inside one split.
  * The test split is never used for tuning or for the final fit.
  * CC-News outlets are split by domain, so its test articles come from outlets never seen in training.
  * Identity and place words (backend/ml/neutral-terms.json) are dropped so the model cannot learn
    dataset prejudice such as "articles about Muslims are fake".
  * Cross-domain experiments are reported separately, plus the false-alarm rate on current headlines
    from major outlets (ml/data/rss_eval.json, collected from the running app's RSS feed).

Usage
  python train_fake_news.py            # downloads data into ml/data if missing
Outputs
  backend/ml/fake-news-model.json      model + metrics
  backend/ml/parity-samples.json       expected outputs for backend/scripts/check-model-parity.js
"""

import json
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import normalize

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT.parent / "backend" / "ml"
SEED = 42

WELFAKE_URL = "https://huggingface.co/datasets/davanstrien/WELFake/resolve/main/data/train-00000-of-00001-290868f0a36350c5.parquet"
FNN_URL = "https://raw.githubusercontent.com/KaiDMML/FakeNewsNet/master/dataset/{name}.csv"
FNN_FILES = ["politifact_fake", "politifact_real", "gossipcop_fake", "gossipcop_real"]
CCNEWS_URL = "https://huggingface.co/datasets/vblagoje/cc_news/resolve/main/plain_text/train-0000{i}-of-00005.parquet"
RELIABILITY_URL = "https://huggingface.co/datasets/sergioburdisso/news_media_reliability/resolve/main/data.csv"
CCNEWS_PER_DOMAIN = 150
CCNEWS_MAX = 30_000
# hand-rated tabloid / unreliable outlets in backend/services/sourceCredibility.js - never used as "real" examples
EXCLUDED_DOMAINS = {"nypost.com", "dailymail.co.uk", "thesun.co.uk", "mirror.co.uk", "express.co.uk", "dailystar.co.uk",
                    "breitbart.com", "newsmax.com", "rt.com", "sputniknews.com", "dailywire.com", "zerohedge.com"}

# ---------------------------------------------------------------------------
# Text normalisation + tokenisation.
# KEEP IN SYNC with backend/services/mlModel.js - the parity check enforces it.
# ---------------------------------------------------------------------------

CONTROL_RE = re.compile(r"[\x00-\x1f\x7f-\x9f\u2028\u2029\ufeff]")
ARTIFACT_PATTERNS = [re.compile(p) for p in [
    r"https?://\S+",
    r"https?\s*:\s*/\s*/\s*\S*",
    r"(?<![a-z0-9_])https?(?![a-z0-9_])",
    r"www\.\S+",
    r"pic\.?\s*twitter\.?\s*com\S*",
    r"\S+@\S+\.\S+",
    r"@[a-z0-9_]+",
    r"\((reuters|ap|afp|upi|pti|ians|ani)\)\s*[-–—:]*",
    r"(?<![a-z0-9_])(reuters|breitbart|flickr|factbox)(?![a-z0-9_])",
    r"follow (him|her|us|me|them) on (twitter|facebook|instagram)",
    r"featured images?( via| credit| courtesy)?",
    r"getty images?",
    r"(images?|photos?|screenshots?|screengrabs?) (via|credit|courtesy|by)",
    r"21st century wire",
    r"via youtube",
    r"[\[(](videos?|images?|tweets?|watch|photos?|details)[\])]",
]]
ACRONYM_RE = re.compile(r"(?<![a-z0-9_])([a-z])\.([a-z])(?:\.([a-z]))?\.?(?![a-z])")
TOKEN_RE = re.compile(r"[a-z]{2,}|[0-9]+(?:[.,:/][0-9]+)*|[!?]")
# identity / place words carry dataset bias (e.g. 2016 propaganda about Muslims), not credibility
NEUTRAL_TERMS = frozenset(json.loads((ROOT.parent / "backend" / "ml" / "neutral-terms.json").read_text())["terms"])


def normalize_text(text):
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(ch for ch in text if not unicodedata.category(ch).startswith("M"))
    text = CONTROL_RE.sub(" ", text.lower())
    for pattern in ARTIFACT_PATTERNS:
        text = pattern.sub(" ", text)
    # "U.S." / "US", "U.K." / "UK" ... -> one token (wire copy uses dots, most other outlets do not)
    return ACRONYM_RE.sub(lambda m: "".join(g for g in m.groups() if g), text)


def tokenize(text):
    return ["#" if tok[0].isdigit() else tok for tok in TOKEN_RE.findall(normalize_text(text)) if tok not in NEUTRAL_TERMS]


def word_ngrams(tokens):
    """Same output as sklearn's _word_ngrams for ngram_range=(1, 2) and no stop words."""
    return tokens + [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def download(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        return
    print(f"  downloading {url}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)


BOILERPLATE_RE = re.compile(r"(copyright|all rights reserved|sign up|newsletter|subscribe|follow us|click here|"
                            r"read more|share this|this story has been|contributed to this report|getty|image caption)", re.I)


def strip_site_suffix(title, domain):
    """Drops ' - KLTV.com - Tyler...' / ' | BBC News' style suffixes that name the outlet."""
    root = domain.split(".")[0].lower()
    parts = re.split(r"\s+[-|–—]\s+", title)
    for i in range(1, len(parts)):
        if root in parts[i].lower().replace(" ", "") or len(" ".join(parts[i:]).split()) <= 3:
            return " - ".join(parts[:i]).strip()
    return title.strip()


def load_ccnews():
    download(RELIABILITY_URL, DATA_DIR / "news_media_reliability.csv")
    rel = pd.read_csv(DATA_DIR / "news_media_reliability.csv")
    reliable = set(rel[(rel.reliability_label == 1) & ~(rel.newsguard_score < 75)].domain) - EXCLUDED_DOMAINS
    frames = []
    for i in range(5):
        path = DATA_DIR / f"ccnews_{i}.parquet"
        download(CCNEWS_URL.format(i=i), path)
        df = pd.read_parquet(path, columns=["title", "text", "domain"])
        df["domain"] = df["domain"].str.lower().str.replace(r"^www\.", "", regex=True)
        frames.append(df[df["domain"].isin(reliable) & df["text"].str.len().between(600, 20000)])
    df = pd.concat(frames).sample(frac=1, random_state=SEED)
    df = df.groupby("domain").head(CCNEWS_PER_DOMAIN).head(CCNEWS_MAX)
    df["title"] = [strip_site_suffix(str(t or ""), d) for t, d in zip(df["title"], df["domain"])]
    df["text"] = ["\n".join(line for line in str(t).split("\n") if not BOILERPLATE_RE.search(line)) for t in df["text"]]
    df["body_norm"] = df["text"].map(normalize_text).str.split().str.join(" ")
    df = df[df["body_norm"].str.len() >= 400].drop_duplicates("body_norm")
    print(f"  CC-News: {len(df)} reliable-outlet articles from {df['domain'].nunique()} domains")
    return df


def load_samples():
    download(WELFAKE_URL, DATA_DIR / "welfake.parquet")
    for name in FNN_FILES:
        download(FNN_URL.format(name=name), DATA_DIR / f"fnn_{name}.csv")

    wel = pd.read_parquet(DATA_DIR / "welfake.parquet")
    wel["title"] = wel["title"].fillna("").astype(str).str.strip()
    wel["text"] = wel["text"].fillna("").astype(str).str.strip()
    wel["body_norm"] = wel["text"].map(normalize_text).str.split().str.join(" ")
    wel["title_norm"] = wel["title"].map(normalize_text).str.split().str.join(" ")

    before = len(wel)
    wel = wel[wel["body_norm"].str.len() >= 200]          # empty bodies are 99.9% fake: pure artifact
    # Breitbart is rated unreliable (News Media Reliability dataset) but WELFake labels its articles real
    is_breitbart = (wel["title"] + " " + wel["text"]).str.contains(r"breitbart|delingpole", case=False, regex=True)
    wel = wel[~(is_breitbart & (wel["label"] == 0))]
    wel = wel.drop_duplicates("body_norm")
    # one label per headline, otherwise the same title would be both real and fake
    conflicting = wel.groupby("title_norm")["label"].nunique()
    wel = wel[~wel["title_norm"].isin(conflicting[conflicting > 1].index) | (wel["title_norm"] == "")]
    print(f"  WELFake: {before} rows -> {len(wel)} after cleaning/dedup")

    rows = []
    for idx, r in wel.iterrows():
        group = f"t:{r.title_norm}" if r.title_norm else f"w:{idx}"
        rows.append({"text": f"{r.title}. {r.text}" if r.title else r.text, "label": int(r.label),
                     "source": "welfake_article", "group": group})
    titles = wel[wel["title_norm"].str.split().str.len() >= 4].drop_duplicates("title_norm")
    for _, r in titles.iterrows():
        rows.append({"text": r.title, "label": int(r.label), "source": "welfake_title", "group": f"t:{r.title_norm}"})

    for name in FNN_FILES:
        fnn = pd.read_csv(DATA_DIR / f"fnn_{name}.csv", usecols=["title"]).dropna()
        source, kind = name.split("_")
        fnn["title_norm"] = fnn["title"].astype(str).map(normalize_text).str.split().str.join(" ")
        fnn = fnn[fnn["title_norm"].str.split().str.len() >= 4].drop_duplicates("title_norm")
        for _, r in fnn.iterrows():
            rows.append({"text": str(r.title), "label": 1 if kind == "fake" else 0,
                         "source": source, "group": f"t:{r.title_norm}"})

    cc = load_ccnews()
    for _, r in cc.iterrows():
        group = f"d:{r.domain}"  # whole outlet stays in one split
        rows.append({"text": f"{r.title}. {r.text}" if r.title else r.text, "label": 0, "source": "ccnews_article", "group": group})
        if len(r.title.split()) >= 4:
            rows.append({"text": r.title, "label": 0, "source": "ccnews_title", "group": group})

    df = pd.DataFrame(rows)
    # a headline that appears with both labels across datasets is unusable
    group_labels = df.groupby("group")["label"].nunique()
    df = df[df["group"].map(group_labels) == 1].reset_index(drop=True)
    return df


def split(df):
    """80/10/10 split, stratified by source+label, every group (story) stays in one split."""
    strata = df["source"] + "_" + df["label"].astype(str)
    folds = list(StratifiedGroupKFold(n_splits=10, shuffle=True, random_state=SEED).split(df, strata, df["group"]))
    test_idx = folds[0][1]
    val_idx = folds[1][1]
    part = np.full(len(df), "train", dtype=object)
    part[test_idx] = "test"
    part[val_idx] = "val"
    return part


# ---------------------------------------------------------------------------
# Training helpers
# ---------------------------------------------------------------------------

def metrics(y_true, prob, threshold=0.5):
    pred = (prob >= threshold).astype(int)
    out = {
        "n": int(len(y_true)),
        "fakeShare": round(float(np.mean(y_true)), 4),
        "accuracy": round(accuracy_score(y_true, pred), 4),
        "precision": round(precision_score(y_true, pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, pred, zero_division=0), 4),
        "macroF1": round(f1_score(y_true, pred, average="macro", zero_division=0), 4),
    }
    if len(set(y_true)) > 1:
        out["rocAuc"] = round(roc_auc_score(y_true, prob), 4)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    out["confusion"] = {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
    return out


def source_score(y_true, prob):
    """macro-F1 when both classes are present, accuracy for single-class sources (CC-News is all real)."""
    if len(set(y_true)) > 1:
        return f1_score(y_true, prob >= 0.5, average="macro")
    return accuracy_score(y_true, prob >= 0.5)


def rss_eval(prob_fn):
    """False-alarm rate on current headlines + blurbs from major outlets (all assumed real)."""
    path = DATA_DIR / "rss_eval.json"
    if not path.exists():
        return None
    rows = json.loads(path.read_text())
    prob = prob_fn([r["text"] for r in rows])
    by_source = {}
    for r, p in zip(rows, prob):
        by_source.setdefault(r["source"], []).append(p)
    return {
        "n": len(rows),
        "outlets": len(by_source),
        "flaggedFakeShare": round(float(np.mean(prob >= 0.5)), 4),
        "meanCredibility": round(float(100 * (1 - np.mean(prob))), 1),
        "byOutlet": {k: round(float(np.mean(np.array(v) >= 0.5)), 3) for k, v in sorted(by_source.items())}
    }


def per_source(df, prob):
    report = {"overall": metrics(df["label"].values, prob)}
    for source in sorted(df["source"].unique()):
        mask = (df["source"] == source).values
        report[source] = metrics(df["label"].values[mask], prob[mask])
    return report


def counts_matrix(token_lists, fit_on):
    vec = CountVectorizer(analyzer=word_ngrams, min_df=3, dtype=np.float32)
    vec.fit([token_lists[i] for i in fit_on])
    return vec


def tfidf_for_columns(counts, cols, idf_rows):
    """Sublinear tf-idf restricted to `cols`, idf learned from `idf_rows`, l2-normalised."""
    sub = counts[:, cols]
    transformer = TfidfTransformer(sublinear_tf=True, norm=None).fit(sub[idf_rows])
    return normalize(transformer.transform(sub), norm="l2", copy=False)


def main():
    t0 = time.time()
    print("Loading data")
    df = load_samples()
    df["part"] = split(df)
    print(df.groupby(["source", "part"])["label"].agg(["count", "mean"]).round(3).to_string())

    print("Tokenising")
    tokens = [tokenize(t) for t in df["text"]]
    train_idx = np.where(df["part"] == "train")[0]
    val_idx = np.where(df["part"] == "val")[0]
    test_idx = np.where(df["part"] == "test")[0]
    fit_idx = np.concatenate([train_idx, val_idx])
    y = df["label"].values

    print("Hyper-parameter search on the validation split")
    count_vec = counts_matrix(tokens, train_idx)
    counts = count_vec.transform(tokens)
    term_totals = np.asarray(counts[train_idx].sum(axis=0)).ravel()
    order = np.argsort(-term_totals, kind="stable")
    results = []
    for max_features in [60_000, 120_000, 200_000]:
        cols = np.sort(order[:max_features])
        X = tfidf_for_columns(counts, cols, train_idx)
        for C in [4.0, 10.0, 25.0]:
            clf = LogisticRegression(C=C, solver="liblinear", max_iter=2000, class_weight="balanced")
            clf.fit(X[train_idx], y[train_idx])
            prob = clf.predict_proba(X[val_idx])[:, 1]
            # averaged over sources so the big GossipCop/CC-News sets do not dominate the choice
            sources = df["source"].values[val_idx]
            score = np.mean([source_score(y[val_idx][sources == s], prob[sources == s]) for s in np.unique(sources)])
            print(f"  max_features={max_features:>7}  C={C:>5}  val macro-F1 (avg over sources)={score:.4f}")
            results.append((score, max_features, C))
    best_score = max(r[0] for r in results)
    # smallest model within 0.003 of the best score: differences below that are noise, size is not
    _, max_features, C = min((r for r in results if r[0] >= best_score - 0.003), key=lambda r: (r[1], -r[0]))
    print(f"  -> chose max_features={max_features}, C={C}")

    print("Cross-domain check: WELFake only -> FakeNewsNet")
    wel_fit = fit_idx[np.isin(df["source"].values[fit_idx], ["welfake_article", "welfake_title"])]
    fnn_test = test_idx[np.isin(df["source"].values[test_idx], ["politifact", "gossipcop"])]
    cols = np.sort(order[:max_features])
    X = tfidf_for_columns(counts, cols, wel_fit)
    clf = LogisticRegression(C=C, solver="liblinear", max_iter=2000).fit(X[wel_fit], y[wel_fit])
    cross_domain = per_source(df.iloc[fnn_test], clf.predict_proba(X[fnn_test])[:, 1])
    for k, v in cross_domain.items():
        print(f"  {k:15s} acc={v['accuracy']:.3f}  macroF1={v['macroF1']:.3f}  auc={v.get('rocAuc', float('nan')):.3f}")

    print("Ablation: same model without CC-News -> false alarms on unseen reliable outlets")
    no_cc_fit = fit_idx[~np.isin(df["source"].values[fit_idx], ["ccnews_article", "ccnews_title"])]
    cc_test = test_idx[np.isin(df["source"].values[test_idx], ["ccnews_article", "ccnews_title"])]
    X = tfidf_for_columns(counts, cols, no_cc_fit)
    clf = LogisticRegression(C=C, solver="liblinear", max_iter=2000, class_weight="balanced").fit(X[no_cc_fit], y[no_cc_fit])
    ablation = per_source(df.iloc[cc_test], clf.predict_proba(X[cc_test])[:, 1])
    count_vec_ablation = CountVectorizer(analyzer=word_ngrams, vocabulary=count_vec.get_feature_names_out()[cols].tolist())
    transformer = TfidfTransformer(sublinear_tf=True).fit(count_vec_ablation.transform([tokens[i] for i in no_cc_fit]))
    ablation_rss = rss_eval(lambda texts: clf.predict_proba(transformer.transform(
        count_vec_ablation.transform([tokenize(t) for t in texts])))[:, 1])
    for k in ["ccnews_article", "ccnews_title"]:
        print(f"  {k:15s} correctly real={ablation[k]['accuracy']:.3f}")
    if ablation_rss:
        print(f"  live RSS headlines flagged fake={ablation_rss['flaggedFakeShare']:.3f}")

    print("Final fit on train+val with the real tokenizer (exported model)")
    fit_totals = CountVectorizer(analyzer=word_ngrams, min_df=3, max_features=max_features, dtype=np.float32)
    fit_totals.fit([tokens[i] for i in fit_idx])
    vocab = sorted(fit_totals.vocabulary_, key=fit_totals.vocabulary_.get)
    vectorizer = TfidfVectorizer(tokenizer=tokenize, lowercase=False, token_pattern=None, ngram_range=(1, 2),
                                 vocabulary=vocab, sublinear_tf=True, norm="l2", dtype=np.float64)
    texts = df["text"].tolist()
    vectorizer.fit([texts[i] for i in fit_idx])
    # round the weights first so the evaluated model is byte-for-byte the exported one
    vectorizer.idf_ = np.round(vectorizer.idf_, 6)
    X_fit = vectorizer.transform([texts[i] for i in fit_idx])
    final = LogisticRegression(C=C, solver="liblinear", max_iter=2000, class_weight="balanced").fit(X_fit, y[fit_idx])
    final.coef_ = np.round(final.coef_, 6)
    final.intercept_ = np.round(final.intercept_, 6)

    X_test = vectorizer.transform([texts[i] for i in test_idx])
    test_prob = final.predict_proba(X_test)[:, 1]
    test_report = per_source(df.iloc[test_idx], test_prob)
    for k, v in test_report.items():
        print(f"  TEST {k:15s} n={v['n']:6d} acc={v['accuracy']:.3f}  f1={v['f1']:.3f}  "
              f"macroF1={v['macroF1']:.3f}  auc={v.get('rocAuc', float('nan')):.3f}")
    live = rss_eval(lambda texts: final.predict_proba(vectorizer.transform(texts))[:, 1])
    if live:
        print(f"  LIVE RSS ({live['n']} current headlines, {live['outlets']} outlets): flagged fake={live['flaggedFakeShare']:.3f}, "
              f"mean credibility={live['meanCredibility']}")

    coef = final.coef_[0]
    top_fake = [vocab[i] for i in np.argsort(-coef)[:25]]
    top_real = [vocab[i] for i in np.argsort(coef)[:25]]
    print("  strongest fake cues:", ", ".join(top_fake))
    print("  strongest real cues:", ", ".join(top_real))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    split_sizes = df.groupby(["part", "source"]).size().unstack(fill_value=0).to_dict(orient="index")
    model = {
        "name": "NewsLens Credibility Model",
        "version": datetime.now(timezone.utc).strftime("%Y.%m.%d"),
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "type": "tfidf-logreg",
        "positiveLabel": "fake",
        "ngramRange": [1, 2],
        "sublinearTf": True,
        "hyperparameters": {"C": C, "maxFeatures": max_features, "minDf": 3},
        "datasets": ["WELFake (Verma et al., 2021)", "FakeNewsNet PolitiFact + GossipCop (Shu et al., 2018)",
                     "CC-News reliable outlets (Hamborg et al., 2017; reliability labels: Burdisso et al., 2024)"],
        "splitSizes": {part: {k: int(v) for k, v in d.items()} for part, d in split_sizes.items()},
        "metrics": {
            "test": test_report,
            "liveHeadlines": live,
            "crossDomainWelfakeToFakeNewsNet": cross_domain,
            "ablationWithoutCcNews": {"ccnews": ablation, "liveHeadlines": ablation_rss},
        },
        "intercept": float(final.intercept_[0]),
        "vocab": vocab,
        "idf": [float(v) for v in vectorizer.idf_],
        "coef": [float(v) for v in coef],
    }
    model_path = OUT_DIR / "fake-news-model.json"
    model_path.write_text(json.dumps(model, separators=(",", ":")))
    print(f"  wrote {model_path} ({model_path.stat().st_size / 1e6:.1f} MB)")

    # Parity samples: real test texts + edge cases for the JS port
    rng = np.random.default_rng(SEED)
    picks = [texts[i] for i in rng.choice(test_idx, size=60, replace=False)]
    picks += [
        "",
        "BREAKING: You won't BELIEVE what they found!!! Share before it's deleted?!",
        "WASHINGTON (Reuters) - The U.S. Senate on Tuesday passed a $1.2 trillion spending bill, officials said.",
        "Visit https://example.com/story?id=12 or email tips@example.org — @newsbot reports 2,500 cases in 2024.",
        "Café owners in Zürich say naïve investors lost €5m; “unprecedented,” said the mayor\u2028next line\ufeff.",
        "Featured image via Getty Images. [VIDEO] 21st Century Wire says pic.twitter.com/abc123 via YouTube",
        "Ünïcödé ﬁ ligature and full-width ＡＢＣ letters plus Ⅻ roman numeral and ² superscript",
        "Scientists at the University of Oxford published a peer-reviewed study in Nature on Monday.",
        "The U.S. and U.K. met at the U.N. at 10:30 a.m.; the U.S-led plan costs $1,200.50 (AP) - e.g. 23:40 on 10/26/2016.",
        "LONDON (AP) — Officials in the US, UK and EU said 3.5% growth was expected, per the U.S.A. report.",
        "Muslim, Hindu and Christian leaders in India and Pakistan met refugees; Black and gay activists joined.",
    ]
    X_par = vectorizer.transform(picks)
    parity = [{"text": t, "tokens": tokenize(t), "probFake": float(p)}
              for t, p in zip(picks, final.predict_proba(X_par)[:, 1])]
    (OUT_DIR / "parity-samples.json").write_text(json.dumps(parity, ensure_ascii=False, indent=1))
    print(f"Done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
