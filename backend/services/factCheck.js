/**
 * Google Fact Check Tools API (optional, free key: https://developers.google.com/fact-check/tools/api).
 * Finds published fact-checks (PolitiFact, Snopes, AFP, ...) for the claim being analysed.
 */

const config = require('../config');
const { TtlCache } = require('../utils/cache');

const cache = new TtlCache({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 300 });
const FALSE_RE = /\b(false|fake|pants on fire|incorrect|misleading|no evidence|fabricated|hoax|scam|wrong|baseless|debunked|satire|distorts|unproven|not true)\b/i;
const TRUE_RE = /\b(true|correct|accurate|mostly true|verified)\b/i;

const isConfigured = () => Boolean(config.factCheckApiKey);

function ratingToScore(rating) {
    if (!rating) return null;
    if (/mostly false|half true|mixture|partly|partially|missing context|needs context/i.test(rating)) return 40;
    if (FALSE_RE.test(rating)) return 10;
    if (TRUE_RE.test(rating)) return 90;
    return null;
}

async function search(query) {
    if (!isConfigured() || !query || query.length < 12) return [];
    const q = query.replace(/\s+/g, ' ').trim().slice(0, 200);
    return cache.wrap(q.toLowerCase(), async () => {
        const params = new URLSearchParams({ query: q, languageCode: 'en', pageSize: '5', key: config.factCheckApiKey });
        try {
            const response = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`, {
                signal: AbortSignal.timeout(8000)
            });
            if (!response.ok) {
                console.error('[FactCheck] API error', response.status, (await response.text()).slice(0, 200));
                return [];
            }
            const data = await response.json();
            return (data.claims || []).flatMap((claim) => (claim.claimReview || []).slice(0, 1).map((review) => ({
                claim: claim.text,
                claimant: claim.claimant || null,
                publisher: review.publisher?.name || review.publisher?.site || 'Fact-checker',
                rating: review.textualRating || null,
                score: ratingToScore(review.textualRating),
                url: review.url,
                reviewedAt: review.reviewDate || null
            }))).slice(0, 4);
        } catch (error) {
            console.error('[FactCheck] Request failed:', error.message);
            return [];
        }
    });
}

module.exports = { isConfigured, search };
