/**
 * Central configuration - every environment variable the backend reads lives here.
 */

require('dotenv').config();
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';

const clean = (value) => (value || '').trim().replace(/^["']|["']$/g, '');

let jwtSecret = clean(process.env.JWT_SECRET);
if (!jwtSecret) {
    if (isProduction) {
        // Never fall back to a constant in production: it would be public in the repo.
        jwtSecret = crypto.randomBytes(48).toString('hex');
        console.warn('⚠️  JWT_SECRET is not set - using a random secret, users will be logged out on restart.');
    } else {
        jwtSecret = 'newslens-local-development-secret';
    }
}

module.exports = {
    isProduction,
    port: Number(process.env.PORT) || 5001,
    mongoUri: clean(process.env.MONGODB_URI),
    jwtSecret,
    jwtExpire: '7d',
    openRouter: {
        apiKey: clean(process.env.OPENROUTER_API_KEY),
        model: clean(process.env.OPENROUTER_MODEL) || 'openai/gpt-oss-120b',
        visionModel: clean(process.env.OPENROUTER_VISION_MODEL) || 'qwen/qwen3.8-27b',
        fallbackModel: clean(process.env.OPENROUTER_FALLBACK_MODEL) || 'openai/gpt-4o-mini',
        siteUrl: clean(process.env.PUBLIC_SITE_URL) || 'http://localhost:5173'
    },
    groq: {
        apiKey: clean(process.env.GROQ_API_KEY),
        model: clean(process.env.GROQ_MODEL) || 'openai/gpt-oss-120b',
        fallbackModel: clean(process.env.GROQ_FALLBACK_MODEL) || 'openai/gpt-oss-20b',
        visionModel: clean(process.env.GROQ_VISION_MODEL) || 'qwen/qwen3.8-27b'
    },
    // Which LLM provider to try first; the next one is used automatically when it fails
    llmProviderOrder: (clean(process.env.LLM_PROVIDER_ORDER) || 'groq,openrouter').split(',').map((p) => p.trim()).filter(Boolean),
    // Let the AI fact-check search the live web (Groq browser_search / OpenRouter web plugin)
    factCheckWebSearch: clean(process.env.FACT_CHECK_WEB_SEARCH) !== 'false',
    newsApiKey: clean(process.env.NEWS_API_KEY),
    factCheckApiKey: clean(process.env.GOOGLE_FACTCHECK_API_KEY)
};
