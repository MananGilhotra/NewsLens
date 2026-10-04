/**
 * News Controller - live feed with trust scoring and article summaries
 */

const crypto = require('crypto');
const newsSources = require('../services/newsSources');
const sourceCredibility = require('../services/sourceCredibility');
const mlModel = require('../services/mlModel');
const llm = require('../services/llmService');
const { summarize, cleanText } = require('../services/summarizer');
const { extractArticle } = require('../services/articleExtractor');
const { TtlCache } = require('../utils/cache');

const summaryCache = new TtlCache({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1000 });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getTrustTier = (score) => (score >= 70 ? 'VERIFIED' : score >= 45 ? 'MODERATE' : 'CAUTION');

/**
 * Trust = source reputation (when the outlet is known) blended with the ML model's read of the headline + blurb.
 */
function scoreArticle(article) {
    const source = sourceCredibility.lookup({ url: article.url, name: article.source?.name });
    const ml = mlModel.predict(`${article.title}. ${article.description || ''}`, { topCues: 3 });
    const modelScore = ml ? ml.credibility : 50;
    // Unknown outlets are capped below VERIFIED: the model alone cannot vouch for a source
    const trustScore = Math.round(source ? 0.75 * source.score + 0.25 * modelScore : Math.min(69, 0.5 * modelScore + 0.5 * 55));
    return {
        ...article,
        trustScore,
        trustTier: getTrustTier(trustScore),
        isTrusted: trustScore >= 70,
        trust: {
            source: source && { name: source.name, label: source.label, tier: source.tier, score: source.score },
            model: ml && { score: ml.credibility, cues: ml.credibility < 50 ? ml.cues.fake : ml.cues.real }
        }
    };
}

/**
 * GET /api/news?q=&category=&page=1&pageSize=12
 */
const fetchNews = async (req, res) => {
    try {
        const page = clamp(parseInt(req.query.page, 10) || 1, 1, 50);
        const pageSize = clamp(parseInt(req.query.pageSize, 10) || 12, 1, 50);
        const result = await newsSources.getNews({
            q: String(req.query.q || ''),
            category: String(req.query.category || ''),
            page,
            pageSize
        });

        return res.json({
            success: true,
            data: {
                articles: result.articles.map(scoreArticle),
                totalResults: result.totalResults,
                page,
                pageSize,
                hasMore: result.hasMore,
                provider: result.provider
            }
        });
    } catch (error) {
        console.error('[News] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch news feed' });
    }
};

async function llmSummary(title, text) {
    const reply = await llm.chatJson([
        {
            role: 'system',
            content: 'You are a precise news editor. Summarise articles faithfully - never add facts that are not in the text.'
        },
        {
            role: 'user',
            content: `Summarise this article in exactly 3 bullet points of at most 25 words each, most important first.
Reply with ONLY JSON: {"bullets": ["...", "...", "..."]}

Title: ${title || '(untitled)'}
Article:
"""
${text.slice(0, 9000)}
"""`
        }
    ], { maxTokens: 400, temperature: 0.2 });
    const bullets = reply?.data?.bullets;
    if (!Array.isArray(bullets)) return null;
    const clean = bullets.map((b) => String(b).replace(/^[\s•\-*\d.)]+/, '').trim()).filter((b) => b.length > 3).slice(0, 3);
    return clean.length ? { summary: clean, model: reply.model } : null;
}

/**
 * POST /api/news/summarize
 * Body: { title, content, url }
 * Uses the full article when the URL can be fetched, otherwise the provided snippet.
 */
const summarizeArticle = async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const url = String(req.body?.url || '').trim();

    if (!title && !content && !url) {
        return res.status(400).json({ success: false, error: 'Please provide an article title, content or URL' });
    }

    try {
        const key = url || crypto.createHash('sha1').update(`${title}\n${content}`).digest('hex');
        const data = await summaryCache.wrap(key, async () => {
            let text = cleanText(content);
            let basis = 'snippet';
            if (url) {
                try {
                    const article = await extractArticle(url);
                    if (article.text.length > text.length) {
                        text = article.text;
                        basis = 'full-article';
                    }
                } catch (error) {
                    console.log(`[Summarize] Using snippet - could not fetch article: ${error.message}`);
                }
            }

            if (text.length > 80) {
                const fromLlm = await llmSummary(title, text);
                if (fromLlm) return { ...fromLlm, engine: 'llm', basis };
            }

            const sentences = summarize(text, { title, maxSentences: 3 });
            if (sentences.length) return { summary: sentences, engine: 'extractive', basis };
            return { summary: [title || 'No summary available for this article.'], engine: 'extractive', basis: 'title' };
        });

        return res.json({ success: true, data: { ...data, analyzedAt: new Date().toISOString() } });
    } catch (error) {
        console.error('[Summarize] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to summarize article' });
    }
};

module.exports = { fetchNews, summarizeArticle, scoreArticle };
