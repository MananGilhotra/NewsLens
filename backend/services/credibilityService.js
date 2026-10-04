/**
 * Credibility analysis - combines independent signals into one verdict:
 *   1. NewsLens ML model (always available, judges writing style / patterns)
 *   2. LLM fact-check (Groq or OpenRouter) - claim-level reasoning, live web search when available - optional
 *   3. Source reputation (when the outlet is known)
 *   4. Published fact-checks from Google Fact Check Tools - optional
 * Each signal is weighted by how reliable it is for this particular input.
 */

const mlModel = require('./mlModel');
const llm = require('./llmService');
const sourceCredibility = require('./sourceCredibility');
const factCheck = require('./factCheck');
const config = require('../config');

const LLM_CHAR_LIMIT = 12000;
const EVIDENCE_FOR_FULL_SCORE = 0.5; // total signal weight needed before a score may reach 0 or 100

const buildPrompt = () => `You are NewsLens, a meticulous professional fact-checker. Today's date is ${new Date().toISOString().slice(0, 10)}.
Assess how credible the given news content is. When a web search tool is available, ALWAYS use it before answering:
look for published fact-checks of the main claim (PolitiFact, Snopes, AFP Fact Check, Full Fact, Reuters Fact Check and similar)
and for reputable reporting. Prefer established news organisations and official sources over blogs and social media. Consider:
- Factual accuracy of concrete claims against well-established knowledge and scientific consensus
- Internal consistency, plausibility, and whether claims are attributed to verifiable sources
- Manipulation: sensationalism, emotional or loaded language, clickbait, conspiracy framing, missing context, fabricated quotes or statistics
- Satire or parody presented as news

Important: if the content describes events you have no knowledge of (for example because they happened after your training data),
do NOT call it fake for that reason alone - judge it on plausibility, sourcing and style, and lower your confidence instead.

Reply with ONLY a JSON object:
{
  "score": <integer 0-100, 0 = fabricated/false, 100 = accurate and well-sourced>,
  "verdict": "Real" | "Fake" | "Inconclusive",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "<2-3 sentences explaining the verdict for a general audience>",
  "claims": [{"claim": "<short claim>", "assessment": "supported" | "disputed" | "false" | "unverifiable"}],
  "redFlags": ["<short phrase>"]
}
List at most 3 claims and at most 4 red flags (empty arrays are fine).`;

async function llmAssessment(text) {
    const reply = await llm.chatJson([
        { role: 'system', content: buildPrompt() },
        { role: 'user', content: `CONTENT TO ANALYSE:\n"""\n${text.slice(0, LLM_CHAR_LIMIT)}\n"""` }
    ], { maxTokens: 800, webSearch: config.factCheckWebSearch });
    const data = reply?.data;
    if (!data || typeof data.score !== 'number') return null;
    const verdict = ['Real', 'Fake', 'Inconclusive'].includes(data.verdict) ? data.verdict : 'Inconclusive';
    return {
        score: Math.max(0, Math.min(100, Math.round(data.score))),
        verdict,
        confidence: ['High', 'Medium', 'Low'].includes(data.confidence) ? data.confidence : 'Medium',
        reasoning: String(data.reasoning || '').slice(0, 800),
        claims: (Array.isArray(data.claims) ? data.claims : []).slice(0, 3).map((c) => ({
            claim: String(c.claim || '').slice(0, 200),
            assessment: ['supported', 'disputed', 'false', 'unverifiable'].includes(c.assessment) ? c.assessment : 'unverifiable'
        })).filter((c) => c.claim),
        redFlags: (Array.isArray(data.redFlags) ? data.redFlags : []).slice(0, 4).map((f) => String(f).slice(0, 80)),
        sources: dedupeSources(reply.sources),
        webFactChecks: findFactChecks(reply.sources),
        grounded: reply.sources.length > 0,
        provider: reply.provider,
        model: reply.model
    };
}

/** One link per website (up to 5), so the reader sees a spread of outlets rather than five pages of one. */
function dedupeSources(sources = []) {
    const seen = new Set();
    return sources.filter((s) => {
        let host;
        try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch { return false; }
        if (seen.has(host)) return false;
        seen.add(host);
        return true;
    }).slice(0, 5);
}

// Fact-checking organisations (IFCN signatories and newsroom fact-check desks)
const FACT_CHECKERS = {
    'politifact.com': 'PolitiFact', 'snopes.com': 'Snopes', 'factcheck.org': 'FactCheck.org', 'factcheck.afp.com': 'AFP Fact Check',
    'fullfact.org': 'Full Fact', 'africacheck.org': 'Africa Check', 'leadstories.com': 'Lead Stories', 'checkyourfact.com': 'Check Your Fact',
    'healthfeedback.org': 'Health Feedback', 'sciencefeedback.co': 'Science Feedback', 'climatefeedback.org': 'Climate Feedback',
    'boomlive.in': 'BOOM', 'altnews.in': 'Alt News', 'factly.in': 'Factly', 'newschecker.in': 'Newschecker', 'vishvasnews.com': 'Vishvas News',
    'newsmeter.in': 'NewsMeter', 'logicallyfacts.com': 'Logically Facts', 'misbar.com': 'Misbar', 'correctiv.org': 'CORRECTIV',
    'maldita.es': 'Maldita', 'newtral.es': 'Newtral', 'aosfatos.org': 'Aos Fatos', 'teyit.org': 'Teyit', 'verafiles.org': 'VERA Files',
    'rappler.com': 'Rappler', 'dpa-factchecking.com': 'dpa Fact-Checking', 'mythdetector.com': 'Myth Detector'
};
const FACT_CHECK_PATH = /fact-?check|factcheck|fact_check|webqoof|ap-fact-check|reality-check|verify/i;

/** Fact-check articles among the AI's web-search results (no Google key needed). */
function findFactChecks(sources = []) {
    const seen = new Set();
    return sources.flatMap((s) => {
        let url;
        try { url = new URL(s.url); } catch { return []; }
        const host = url.hostname.replace(/^www\./, '');
        const knownChecker = Object.keys(FACT_CHECKERS).find((d) => host === d || host.endsWith(`.${d}`));
        const looksLikeCheck = FACT_CHECK_PATH.test(url.pathname) || /\bfact[\s-]?check/i.test(s.title || '');
        if ((!knownChecker && !looksLikeCheck) || seen.has(url.href)) return [];
        seen.add(url.href);
        const publisher = knownChecker ? FACT_CHECKERS[knownChecker] : sourceCredibility.lookup({ url: url.href })?.name || host;
        return [{ claim: s.title || url.href, claimant: null, publisher, rating: null, score: null, url: url.href, reviewedAt: null, via: 'web-search' }];
    }).slice(0, 4);
}

function claimQuery(text, title) {
    if (title) return title;
    const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text;
    return firstSentence.slice(0, 200);
}

const verdictFor = (score) => (score >= 60 ? 'Real' : score <= 40 ? 'Fake' : 'Inconclusive');

function describeModel(ml) {
    const leaning = ml.credibility >= 60 ? 'resembles credible reporting' : ml.credibility <= 40 ? 'resembles known misinformation' : 'is ambiguous';
    const cues = (ml.credibility < 50 ? ml.cues.fake : ml.cues.real).slice(0, 3).map((c) => `“${c.term}”`);
    let sentence = `The NewsLens model finds the writing ${leaning} (${Math.round(ml.probFake * 100)}% fake-probability)`;
    if (cues.length) sentence += `, driven by cues such as ${cues.join(', ')}`;
    if (ml.tokenCount < 12) sentence += '. Short inputs give the model little to go on, so treat this as a weak signal';
    return `${sentence}.`;
}

/**
 * @param {{ text: string, title?: string, url?: string, sourceName?: string }} input
 */
async function analyze({ text, title, url, sourceName }) {
    const ml = mlModel.predict(text);
    const source = url || sourceName ? sourceCredibility.lookup({ url, name: sourceName }) : null;
    const [llmResult, factChecks] = await Promise.all([
        llmAssessment(text),
        factCheck.search(claimQuery(text, title))
    ]);

    // Published fact-checks: Google Fact Check database (if configured) + fact-check articles the AI found on the web
    const seenChecks = new Set(factChecks.map((f) => f.url));
    const allFactChecks = [...factChecks, ...(llmResult?.webFactChecks || []).filter((f) => !seenChecks.has(f.url))].slice(0, 5);

    const parts = [];
    if (ml) {
        const lengthFactor = Math.min(1, Math.max(0.25, ml.tokenCount / 80));
        parts.push({ key: 'model', score: ml.credibility, weight: 0.4 * lengthFactor });
    }
    if (llmResult) {
        const confidenceFactor = { High: 1, Medium: 0.75, Low: 0.45 }[llmResult.confidence];
        // a fact-check backed by live search results is stronger evidence than model memory alone
        parts.push({ key: 'llm', score: llmResult.score, weight: (llmResult.grounded ? 0.7 : 0.55) * confidenceFactor });
    }
    if (source) parts.push({ key: 'source', score: source.score, weight: source.tier === 'satire' ? 0.8 : 0.25 });
    const rated = factChecks.filter((f) => f.score !== null);
    if (rated.length) {
        parts.push({ key: 'factChecks', score: rated.reduce((s, f) => s + f.score, 0) / rated.length, weight: 0.7 });
    }

    const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
    const blended = totalWeight ? parts.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight : 50;
    // Little evidence (e.g. a one-line input judged by the style model alone) pulls the score towards 50
    const evidence = Math.min(1, totalWeight / EVIDENCE_FOR_FULL_SCORE);
    const score = Math.round(50 + (blended - 50) * evidence);
    const verdict = verdictFor(score);

    // Confidence: strength of the combined score and how much the signals agree with it.
    // A single signal is never "High" - it needs independent corroboration.
    const disagreement = totalWeight
        ? parts.reduce((s, p) => s + p.weight * Math.abs(p.score - blended), 0) / totalWeight
        : 50;
    const strength = Math.abs(score - 50);
    let confidence = strength >= 28 && disagreement < 25 ? 'High' : strength >= 14 && disagreement < 35 ? 'Medium' : 'Low';
    if (parts.length < 2 && confidence === 'High') confidence = 'Medium';

    const reasoning = [
        llmResult?.reasoning,
        ml && describeModel(ml),
        source && `${source.name} is rated “${source.label.toLowerCase()}” in the NewsLens source index.`,
        rated.length && `${rated.length} published fact-check${rated.length > 1 ? 's' : ''} matched this claim (${rated.map((f) => `${f.publisher}: ${f.rating}`).join('; ')}).`
    ].filter(Boolean).join(' ');

    return {
        score,
        verdict,
        confidence,
        reasoning: reasoning || 'Not enough signal to assess this content.',
        engine: parts.map((p) => p.key),
        signals: {
            model: ml && {
                score: ml.credibility,
                probFake: Math.round(ml.probFake * 1000) / 1000,
                confidence: ml.confidence,
                tokens: ml.tokenCount,
                cues: ml.cues,
                weight: parts.find((p) => p.key === 'model')?.weight
            },
            llm: llmResult && { ...llmResult, weight: parts.find((p) => p.key === 'llm')?.weight },
            source: source && { name: source.name, domain: source.domain, tier: source.tier, label: source.label, score: source.score },
            factChecks: allFactChecks,
            factCheckSearch: factCheck.isConfigured() || Boolean(llmResult?.grounded)
        }
    };
}

module.exports = { analyze, verdictFor };
