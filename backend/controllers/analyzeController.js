/**
 * Analyze Controller - fact-checking for text/URLs and deepfake detection for media
 */

const AnalysisLog = require('../models/AnalysisLog');
const credibility = require('../services/credibilityService');
const mediaAnalysis = require('../services/mediaAnalysis');
const { extractArticle } = require('../services/articleExtractor');
const { isDbReady } = require('../middleware/authMiddleware');

const MAX_TEXT = 20000;
const BASE64_RE = /^[A-Za-z0-9+/=\s]+$/;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/analyze
 * Body: { text } or { url }
 */
const analyze = async (req, res) => {
    try {
        const { url, text } = req.body || {};
        if (!url && !text) {
            return res.status(400).json({ success: false, error: 'Please provide either a URL or text to analyze' });
        }

        let content;
        let article = null;
        const inputType = url ? 'url' : 'text';

        if (url) {
            try {
                article = await extractArticle(String(url).trim());
            } catch (error) {
                return res.status(error.status || 422).json({ success: false, error: error.message });
            }
            content = `${article.title}\n\n${article.text}`;
        } else {
            content = String(text).trim();
            if (content.length < 10) {
                return res.status(400).json({ success: false, error: 'Content is too short. Please provide more text to analyze.' });
            }
            if (content.length > MAX_TEXT) {
                return res.status(400).json({ success: false, error: `Content is too long. Please limit to ${MAX_TEXT.toLocaleString()} characters.` });
            }
        }

        console.log(`[Analyze] ${inputType}: ${(article?.url || content).slice(0, 80)}`);
        const result = await credibility.analyze({ text: content, title: article?.title, url: article?.url });

        if (isDbReady()) {
            AnalysisLog.create({
                user: req.user?.id,
                inputType,
                content: content.slice(0, 5000),
                title: (article?.title || content.split('\n')[0]).slice(0, 300),
                url: article?.url,
                score: result.score,
                verdict: result.verdict,
                confidence: result.confidence,
                engine: result.engine,
                reasoning: result.reasoning.slice(0, 2000)
            }).catch((error) => console.error('[Analyze] Failed to log analysis:', error.message));
        }

        return res.json({
            success: true,
            data: {
                ...result,
                analyzedAt: new Date().toISOString(),
                input: { type: inputType, preview: content.slice(0, 280) },
                article: article && {
                    title: article.title,
                    url: article.url,
                    domain: article.domain,
                    siteName: article.siteName,
                    byline: article.byline,
                    publishedAt: article.publishedAt,
                    image: article.image,
                    excerpt: article.excerpt,
                    words: article.text.split(/\s+/).length
                }
            }
        });
    } catch (error) {
        console.error('[Analyze] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to analyze content. Please try again.' });
    }
};

/**
 * GET /api/analyze/history - the signed-in user's recent checks
 */
const history = async (req, res) => {
    if (!isDbReady()) return res.json({ success: true, data: [], available: false });
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
        const logs = await AnalysisLog.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('inputType title url score verdict confidence engine createdAt')
            .lean();
        return res.json({ success: true, data: logs, available: true });
    } catch (error) {
        console.error('[Analyze] History fetch error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
};

/**
 * POST /api/analyze/deepfake
 * Body: { frames: [{ data: base64, mediaType }], original?: base64 (first bytes of the file), isVideo, fileName }
 * Legacy body { media, mediaType } is still accepted.
 */
const deepfake = async (req, res) => {
    try {
        const { media, mediaType, original, isVideo = false, fileName = 'upload' } = req.body || {};
        const frames = Array.isArray(req.body?.frames) ? req.body.frames : media ? [{ data: media, mediaType }] : [];

        if (!frames.length || frames.length > 4) {
            return res.status(400).json({ success: false, error: 'Please provide an image (or up to 4 video frames) to analyze' });
        }
        for (const frame of frames) {
            if (typeof frame?.data !== 'string' || !BASE64_RE.test(frame.data.slice(0, 200)) || frame.data.length > 8_000_000) {
                return res.status(400).json({ success: false, error: 'Invalid or oversized image data' });
            }
            if (!IMAGE_TYPES.includes(frame.mediaType)) {
                return res.status(400).json({ success: false, error: 'Frames must be JPEG, PNG or WebP images' });
            }
        }

        console.log(`[Deepfake] ${fileName} (${frames.length} frame${frames.length > 1 ? 's' : ''}${isVideo ? ', video' : ''})`);
        const result = await mediaAnalysis.analyzeMedia({
            frames,
            original: typeof original === 'string' && original.length < 8_000_000 ? Buffer.from(original, 'base64') : null,
            isVideo: Boolean(isVideo)
        });

        return res.json({ success: true, data: { ...result, analyzedAt: new Date().toISOString() } });
    } catch (error) {
        console.error('[Deepfake] Analysis error:', error);
        return res.status(500).json({ success: false, error: 'Failed to analyze media. Please try again.' });
    }
};

module.exports = { analyze, history, deepfake };
