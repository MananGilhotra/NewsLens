/**
 * Fetches a news article and extracts its readable text with Mozilla Readability.
 *
 * Guards against SSRF: only http(s), public IP addresses, manual redirect handling
 * (every hop is re-checked), a size cap and a timeout.
 */

const dns = require('dns').promises;
const net = require('net');
const { parseHTML } = require('linkedom');
const { Readability } = require('@mozilla/readability');
const { TtlCache } = require('../utils/cache');
const { htmlToText } = require('../utils/text');

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const cache = new TtlCache({ ttlMs: 60 * 60 * 1000, maxEntries: 300 });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 NewsLens/2.0',
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    'Accept-Language': 'en-US,en;q=0.9'
};

class ExtractionError extends Error {
    constructor(message, status = 422) {
        super(message);
        this.status = status;
    }
}

function isPrivateAddress(address) {
    if (net.isIPv4(address)) {
        const [a, b] = address.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    const v6 = address.toLowerCase();
    if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
    return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function assertPublicUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new ExtractionError('That does not look like a valid URL.', 400);
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new ExtractionError('Only http(s) links can be analysed.', 400);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
    if (!addresses.length) throw new ExtractionError(`Could not resolve ${url.hostname}.`);
    if (addresses.some(({ address }) => isPrivateAddress(address))) {
        throw new ExtractionError('Links to private or local network addresses are not allowed.', 400);
    }
    return url;
}

async function fetchHtml(startUrl) {
    let url = await assertPublicUrl(startUrl);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(url, { headers: HEADERS, redirect: 'manual', signal: controller.signal });
            if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
                url = await assertPublicUrl(new URL(response.headers.get('location'), url).href);
                continue;
            }
            if (!response.ok) throw new ExtractionError(`The site responded with HTTP ${response.status}.`);
            const type = response.headers.get('content-type') || '';
            if (!/html|xml/i.test(type)) throw new ExtractionError('The link does not point to a web page.');

            const reader = response.body.getReader();
            const chunks = [];
            let size = 0;
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                size += value.length;
                if (size > MAX_BYTES) {
                    await reader.cancel();
                    break;
                }
                chunks.push(value);
            }
            return { html: Buffer.concat(chunks).toString('utf8'), finalUrl: url.href };
        } catch (error) {
            if (error instanceof ExtractionError) throw error;
            throw new ExtractionError(error.name === 'AbortError' ? 'The site took too long to respond.' : `Could not fetch the page (${error.message}).`);
        } finally {
            clearTimeout(timer);
        }
    }
    throw new ExtractionError('Too many redirects.');
}

const meta = (document, ...selectors) => {
    for (const selector of selectors) {
        const value = document.querySelector(selector)?.getAttribute('content');
        if (value) return value.trim();
    }
    return null;
};

async function extract(rawUrl) {
    const { html, finalUrl } = await fetchHtml(rawUrl);
    const { document } = parseHTML(html);

    const info = {
        url: finalUrl,
        domain: new URL(finalUrl).hostname.replace(/^www\./, ''),
        siteName: meta(document, 'meta[property="og:site_name"]', 'meta[name="application-name"]'),
        image: meta(document, 'meta[property="og:image"]', 'meta[name="twitter:image"]'),
        publishedAt: meta(document, 'meta[property="article:published_time"]', 'meta[name="pubdate"]', 'meta[name="date"]'),
        description: meta(document, 'meta[property="og:description"]', 'meta[name="description"]')
    };

    let article = null;
    try {
        article = new Readability(document, { charThreshold: 300 }).parse();
    } catch (error) {
        console.error('[Extractor] Readability failed:', error.message);
    }

    const title = article?.title || meta(document, 'meta[property="og:title"]') || document.querySelector('title')?.textContent?.trim() || '';
    const text = article?.content ? htmlToText(article.content) : (info.description || '').trim();
    if (text.length < 120) {
        throw new ExtractionError('Could not find article text on that page (it may be paywalled or rendered by JavaScript). Paste the text instead.');
    }
    return {
        ...info,
        title,
        byline: article?.byline || null,
        siteName: info.siteName || article?.siteName || null,
        excerpt: article?.excerpt || info.description || null,
        text
    };
}

const extractArticle = (url) => cache.wrap(url, () => extract(url));

module.exports = { extractArticle, assertPublicUrl, ExtractionError };
