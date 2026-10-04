# NewsLens - see through the noise

NewsLens scores how far you can trust a headline, an article or an image. It combines its **own trained
credibility model** with an optional AI fact-check, a reliability rating of **5,300+ news outlets** and
published fact-checks - and shows you every signal behind the verdict.

- **Live news feed** - stories from NewsAPI or 29 publisher RSS feeds, each with a trust score and a one-tap summary
- **Fact-check** - paste text or a link; the full article is fetched, analysed and explained
- **Deepfake check** - image/video metadata forensics (AI generator tags, C2PA, camera EXIF) plus an optional vision-model inspection
- **Everything works without API keys** - keys only make the results richer

## Quick start

Requirements: Node 18+, MongoDB (local or Atlas). Python 3.10+ only if you want to retrain the model.

```bash
cd backend
npm install
cp .env.example .env      # optional keys - see below
npm run dev               # http://localhost:5001
```

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to the backend)
```

Optional demo account for local development: `npm run seed:demo` in `backend/` (credentials are in
`backend/scripts/seed-demo-user.js`; the script refuses to run in production).

## Configuration (`backend/.env`)

| Variable | Enables | Without it |
|---|---|---|
| `MONGODB_URI` | Accounts, login, analysis history | Uses `mongodb://localhost:27017/newslens`; auth returns a clear 503 if no database is reachable |
| `JWT_SECRET` | Stable login sessions | Dev: fixed local secret. Production: random per boot (users re-login after restarts) |
| `GROQ_API_KEY` | AI claim-by-claim fact-check with live web search, AI summaries, visual deepfake inspection (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`; free tier) | NewsLens model + source ratings, extractive (TextRank) summaries, metadata forensics |
| `OPENROUTER_API_KEY` | Alternative / backup AI provider - `LLM_PROVIDER_ORDER` (default `groq,openrouter`) sets the order, failures fall through automatically | Provider skipped |
| `NEWS_API_KEY` | NewsAPI as the feed source | Public RSS feeds (also used automatically when NewsAPI fails or hits its limit) |
| `GOOGLE_FACTCHECK_API_KEY` | Matching claims against PolitiFact, Snopes, AFP… | Signal skipped |

Frontend: set `VITE_API_URL` only when the backend lives on another origin (see `frontend/.env.example`).

> **Security:** earlier commits of this repository contained `backend/.env` with real keys. Rotate the
> OpenRouter key, the NewsAPI key, the MongoDB password and the JWT secret - deleting the file does not
> remove it from git history.

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | `{ text }` or `{ url }` → score 0-100, verdict, confidence, reasoning and every signal |
| `GET` | `/api/analyze/history` | Signed-in user's recent checks |
| `POST` | `/api/analyze/deepfake` | `{ frames: [{ data, mediaType }], original?, isVideo }` → authenticity score + forensics |
| `GET` | `/api/news?q=&category=&page=` | Feed with trust scores (`category`: general, technology, business, science, health, entertainment, sports) |
| `POST` | `/api/news/summarize` | `{ title, content, url }` → 3 bullet points (from the full article when it can be fetched) |
| `POST` | `/api/auth/register`, `/api/auth/login` · `GET /api/auth/me` | Accounts (JWT) |
| `GET` | `/api/health`, `/api/model` | Live capabilities; model card with held-out metrics |

## How a verdict is made

`backend/services/credibilityService.js` weighs four independent signals by how reliable each is for the input:

1. **NewsLens model** (always on) - judges the writing; weight grows with input length
2. **AI fact-check** (Groq or OpenRouter) - tests concrete claims, searching the live web when available; weight follows its confidence
3. **Source reputation** - hand-curated tiers plus the 5.3k-domain News Media Reliability dataset
4. **Published fact-checks** (Google Fact Check Tools)

With little evidence (e.g. one short sentence and no key) the score is pulled towards 50 and confidence is
capped, instead of pretending to be certain.

## The model

`ml/train_fake_news.py` trains a TF-IDF (word 1-2 grams) + logistic-regression classifier and exports it to
`backend/ml/fake-news-model.json`, which `backend/services/mlModel.js` runs in plain JavaScript - no Python at
runtime. `npm run test:model` checks the JS port reproduces scikit-learn exactly.

**Data:** WELFake (72k articles), FakeNewsNet headlines (PolitiFact, GossipCop) and 28k articles from 730
reliable outlets in CC-News - without the latter the model mostly learns Reuters house style and flagged 45%
of current mainstream headlines as fake.

**Honesty measures:** source artifacts (wire datelines, "Featured image via", photo credits, outlet names,
tweet embeds, URLs) are stripped; duplicates removed; every story stays in one split and CC-News test articles
come from outlets never seen in training; the test split is never used for tuning. Identity and place words
(`backend/ml/neutral-terms.json`) are removed so the model cannot learn dataset prejudice such as "articles
about Muslims are fake".

**Held-out results** (deployed model, test split never used for training or tuning):

| Test set | n | Accuracy | ROC-AUC |
|---|---|---|---|
| News articles (WELFake) | 5,776 | 95.1% | 0.988 |
| Headlines only (WELFake) | 5,652 | 87.4% | 0.947 |
| Genuine articles from unseen outlets (CC-News) | 2,848 | 95.4% correctly cleared | - |
| Genuine headlines from unseen outlets (CC-News) | 2,805 | 88.4% correctly cleared | - |
| Political claims (PolitiFact) | 90 | 76.7% | 0.767 |
| Celebrity gossip (GossipCop) | 2,007 | 79.5% | 0.840 |
| Today's headlines from 19 major outlets (RSS) | 828 | 85.0% correctly cleared | - |

**Limitations:** a style model cannot verify facts - well-written falsehoods and very short claims are its
weak spots, which is why the AI fact-check, source ratings and fact-check databases exist. The training data
is mostly 2015-2019 English news.

Retrain (downloads ~1.2 GB of data into `ml/data/`, ~10 minutes on a laptop):

```bash
cd ml
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python train_fake_news.py      # writes backend/ml/fake-news-model.json
.venv/bin/python build_source_index.py   # refreshes backend/data/domain-reliability.json
cd ../backend && npm run test:model
```

## Stack

React 18, Vite, Tailwind, Framer Motion, GSAP (ScrollTrigger, SplitText, ScrambleText), Lenis · Express,
MongoDB/Mongoose, Mozilla Readability · scikit-learn for training.
