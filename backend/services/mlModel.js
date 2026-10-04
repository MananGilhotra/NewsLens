/**
 * NewsLens Credibility Model - inference for the classifier trained by ml/train_fake_news.py.
 *
 * TF-IDF over word uni+bigrams (sublinear tf, l2 norm) followed by logistic regression,
 * re-implemented in plain JS so the backend needs no Python at runtime.
 * scripts/check-model-parity.js verifies the output matches scikit-learn.
 */

const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, '..', 'ml', 'fake-news-model.json');
const MAX_CHARS = 60000;

// KEEP IN SYNC with normalize_text / tokenize in ml/train_fake_news.py
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufeff]/g;
const MARK_RE = /\p{M}/gu;
const ARTIFACT_PATTERNS = [
    /https?:\/\/\S+/g,
    /https?\s*:\s*\/\s*\/\s*\S*/g,
    /(?<![a-z0-9_])https?(?![a-z0-9_])/g,
    /www\.\S+/g,
    /pic\.?\s*twitter\.?\s*com\S*/g,
    /\S+@\S+\.\S+/g,
    /@[a-z0-9_]+/g,
    /\((reuters|ap|afp|upi|pti|ians|ani)\)\s*[-–—:]*/g,
    /(?<![a-z0-9_])(reuters|breitbart|flickr|factbox)(?![a-z0-9_])/g,
    /follow (him|her|us|me|them) on (twitter|facebook|instagram)/g,
    /featured images?( via| credit| courtesy)?/g,
    /getty images?/g,
    /(images?|photos?|screenshots?|screengrabs?) (via|credit|courtesy|by)/g,
    /21st century wire/g,
    /via youtube/g,
    /[[(](videos?|images?|tweets?|watch|photos?|details)[\])]/g
];
const ACRONYM_RE = /(?<![a-z0-9_])([a-z])\.([a-z])(?:\.([a-z]))?\.?(?![a-z])/g;
const TOKEN_RE = /[a-z]{2,}|[0-9]+(?:[.,:/][0-9]+)*|[!?]/g;
// identity / place words carry dataset bias, not credibility - shared with the training script
const NEUTRAL_TERMS = new Set(require('../ml/neutral-terms.json').terms);

function normalizeText(text) {
    let out = String(text || '').normalize('NFKD').replace(MARK_RE, '');
    out = out.toLowerCase().replace(CONTROL_RE, ' ');
    for (const pattern of ARTIFACT_PATTERNS) out = out.replace(pattern, ' ');
    // "U.S." / "US", "U.K." / "UK" ... -> one token (wire copy uses dots, most other outlets do not)
    return out.replace(ACRONYM_RE, (_, a, b, c) => a + b + (c || ''));
}

function tokenize(text) {
    return (normalizeText(text).match(TOKEN_RE) || [])
        .filter((tok) => !NEUTRAL_TERMS.has(tok))
        .map((tok) => (tok[0] >= '0' && tok[0] <= '9' ? '#' : tok));
}

// Function words are valid model features but explain nothing to a reader - hidden from the cue lists
const QUIET_WORDS = new Set(`a an the and or but if of to in on at by for with from as is was are were be been being it its this that
these those he she they them his her their we us our you your i me my not no so than then there here who whom which what # ! ?`.split(/\s+/));
const isExplanatory = (term) => term.split(' ').some((word) => !QUIET_WORDS.has(word));

let model = null;
let loadError = null;

function load() {
    if (model || loadError) return model;
    try {
        const raw = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
        const index = new Map();
        raw.vocab.forEach((term, i) => index.set(term, i));
        model = { ...raw, index, idf: Float64Array.from(raw.idf), coef: Float64Array.from(raw.coef) };
        delete model.vocab;
        console.log(`[ML] Loaded ${raw.name} v${raw.version} (${index.size.toLocaleString()} features)`);
    } catch (error) {
        loadError = error;
        console.error(`[ML] Model not available (${error.message}). Run: cd ml && python train_fake_news.py`);
    }
    return model;
}

const isReady = () => Boolean(load());

/**
 * @returns {null | {
 *   probFake: number, credibility: number, label: 'fake'|'real', confidence: number,
 *   tokenCount: number, knownTerms: number, cues: { fake: {term:string, weight:number}[], real: {term:string, weight:number}[] }
 * }}
 */
function predict(text, { topCues = 6 } = {}) {
    const m = load();
    if (!m) return null;

    const tokens = tokenize(String(text || '').slice(0, MAX_CHARS));
    const counts = new Map();
    const add = (term) => counts.set(term, (counts.get(term) || 0) + 1);
    tokens.forEach(add);
    for (let i = 0; i + 1 < tokens.length; i++) add(`${tokens[i]} ${tokens[i + 1]}`);

    const features = [];
    let sumSquares = 0;
    for (const [term, count] of counts) {
        const idx = m.index.get(term);
        if (idx === undefined) continue;
        const weight = (1 + Math.log(count)) * m.idf[idx];
        features.push([term, idx, weight]);
        sumSquares += weight * weight;
    }

    const norm = Math.sqrt(sumSquares) || 1;
    let decision = m.intercept;
    const contributions = features.map(([term, idx, weight]) => {
        const contribution = (weight / norm) * m.coef[idx];
        decision += contribution;
        return { term, weight: contribution };
    });

    const probFake = 1 / (1 + Math.exp(-decision));
    const round = (v) => Math.round(v * 1000) / 1000;
    const pick = (sign) => contributions
        .filter((c) => Math.sign(c.weight) === sign && isExplanatory(c.term))
        .sort((a, b) => sign * (b.weight - a.weight))
        .slice(0, topCues)
        .map((c) => ({ term: c.term, weight: round(c.weight) }));

    return {
        probFake,
        credibility: Math.round((1 - probFake) * 100),
        label: probFake >= 0.5 ? 'fake' : 'real',
        confidence: round(Math.abs(probFake - 0.5) * 2),
        tokenCount: tokens.length,
        knownTerms: features.length,
        cues: { fake: pick(1), real: pick(-1) }
    };
}

/** Public metadata (no weights) for the health endpoint and the UI. */
function getInfo() {
    const m = load();
    if (!m) return { loaded: false, error: loadError?.message };
    return {
        loaded: true,
        name: m.name,
        version: m.version,
        createdAt: m.createdAt,
        type: m.type,
        features: m.index.size,
        hyperparameters: m.hyperparameters,
        datasets: m.datasets,
        splitSizes: m.splitSizes,
        metrics: m.metrics || {}
    };
}

module.exports = { isReady, predict, getInfo, tokenize, normalizeText };
