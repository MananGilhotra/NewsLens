/**
 * Extractive summariser (TextRank) - works offline, used when no LLM is configured
 * or the LLM call fails.
 *
 * Sentences are ranked with PageRank over a TF-IDF cosine-similarity graph, then
 * boosted by headline overlap and lead position (news is written inverted-pyramid).
 */

const STOP_WORDS = new Set(`a about above after again against all am an and any are as at be because been before being
below between both but by can could did do does doing down during each few for from further had has have having he her
here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on
once only or other our ours ourselves out over own same she should so some such than that the their theirs them
themselves then there these they this those through to too under until up very was we were what when where which while
who whom why will with would you your yours yourself yourselves also said says say one two new like get got via`.split(/\s+/));

const ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'gen', 'gov', 'sen', 'rep', 'lt', 'col', 'capt',
    'sgt', 'inc', 'ltd', 'co', 'corp', 'vs', 'etc', 'no', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept',
    'oct', 'nov', 'dec', 'u.s', 'u.k', 'u.n', 'e.g', 'i.e', 'a.m', 'p.m'];
const ABBREV_RE = new RegExp(`\\b(${ABBREVIATIONS.map((a) => a.replace('.', '\\.')).join('|')})\\.(?=\\s)`, 'gi');

const cleanText = (text) => String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\+\d+ chars\]/g, ' ')            // NewsAPI truncation marker
    .replace(/\s+/g, ' ')
    .trim();

function splitParagraph(paragraph) {
    const protectedText = cleanText(paragraph)
        .replace(ABBREV_RE, '$1<DOT>')
        .replace(/\b([A-Z])\.(?=\s*[A-Z])/g, '$1<DOT>');   // initials: "L.F. Wade", "J. Smith"
    return protectedText
        .split(/(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/)
        .map((s) => s.replace(/<DOT>/g, '.').trim())
        .filter(Boolean);
}

/** Paragraph breaks are hard sentence boundaries (headings and captions often lack punctuation). */
const splitSentences = (text) => String(text || '').split(/\n+/).flatMap(splitParagraph);

const words = (sentence) => (sentence.toLowerCase().match(/[a-z][a-z'-]+/g) || [])
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

function summarize(text, { title = '', maxSentences = 3 } = {}) {
    const seen = new Set();
    const sentences = splitSentences(text).filter((s) => {
        const key = s.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (s.length < 40 || s.length > 450 || seen.has(key)) return false;
        if (/^(advertisement|sign up|subscribe|read more|click here|follow us|share this)/i.test(s)) return false;
        seen.add(key);
        return true;
    });
    if (sentences.length <= maxSentences) return sentences;

    const tokenized = sentences.map(words);
    const df = new Map();
    tokenized.forEach((toks) => new Set(toks).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
    const n = sentences.length;
    const vectors = tokenized.map((toks) => {
        const tf = new Map();
        toks.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
        const vec = new Map();
        let norm = 0;
        for (const [w, c] of tf) {
            const weight = (1 + Math.log(c)) * Math.log(1 + n / df.get(w));
            vec.set(w, weight);
            norm += weight * weight;
        }
        return { vec, norm: Math.sqrt(norm) || 1 };
    });

    const similarity = (a, b) => {
        let dot = 0;
        const [small, large] = a.vec.size < b.vec.size ? [a, b] : [b, a];
        for (const [w, weight] of small.vec) dot += weight * (large.vec.get(w) || 0);
        return dot / (a.norm * b.norm);
    };

    const graph = vectors.map((a, i) => vectors.map((b, j) => (i === j ? 0 : similarity(a, b))));
    const outSums = graph.map((row) => row.reduce((s, v) => s + v, 0) || 1);
    let scores = new Array(n).fill(1 / n);
    for (let iter = 0; iter < 40; iter++) {
        scores = scores.map((_, i) => 0.15 / n + 0.85 * graph.reduce((s, row, j) => s + (row[i] / outSums[j]) * scores[j], 0));
    }

    const titleWords = new Set(words(title));
    const ranked = scores.map((score, i) => {
        const overlap = titleWords.size ? tokenized[i].filter((w) => titleWords.has(w)).length / titleWords.size : 0;
        const position = 1 + 0.6 * Math.exp(-i / 3);
        return { i, score: score * position * (1 + overlap) };
    });

    // pick the best sentences while avoiding near-duplicates, then restore article order
    const chosen = [];
    for (const candidate of ranked.sort((a, b) => b.score - a.score)) {
        if (chosen.every((c) => similarity(vectors[c.i], vectors[candidate.i]) < 0.5)) chosen.push(candidate);
        if (chosen.length === maxSentences) break;
    }
    return chosen.sort((a, b) => a.i - b.i).map((c) => sentences[c.i]);
}

module.exports = { summarize, splitSentences, cleanText };
