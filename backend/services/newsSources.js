/**
 * News providers for the live feed.
 *   - NewsAPI (https://newsapi.org) when NEWS_API_KEY is set
 *   - Public RSS feeds from established outlets otherwise, or whenever NewsAPI fails / hits its limit
 */

const crypto = require('crypto');
const { XMLParser } = require('fast-xml-parser');
const config = require('../config');
const { TtlCache } = require('../utils/cache');
const { decodeEntities } = require('../utils/text');

const FEEDS = [
    ['general', 'BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
    ['general', 'NPR', 'https://feeds.npr.org/1001/rss.xml'],
    ['general', 'Al Jazeera English', 'https://www.aljazeera.com/xml/rss/all.xml'],
    ['general', 'The Guardian', 'https://www.theguardian.com/world/rss'],
    ['general', 'The New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'],
    ['general', 'The Hindu', 'https://www.thehindu.com/news/national/feeder/default.rss'],
    ['general', 'Times of India', 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'],
    ['general', 'Deutsche Welle', 'https://rss.dw.com/rdf/rss-en-all'],
    ['general', 'France 24', 'https://www.france24.com/en/rss'],
    ['general', 'Sky News', 'https://feeds.skynews.com/feeds/rss/world.xml'],
    ['general', 'NDTV', 'https://feeds.feedburner.com/ndtvnews-top-stories'],
    ['technology', 'BBC News', 'https://feeds.bbci.co.uk/news/technology/rss.xml'],
    ['technology', 'The Guardian', 'https://www.theguardian.com/uk/technology/rss'],
    ['technology', 'The New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'],
    ['technology', 'TechCrunch', 'https://techcrunch.com/feed/'],
    ['technology', 'The Verge', 'https://www.theverge.com/rss/index.xml'],
    ['technology', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'],
    ['technology', 'Wired', 'https://www.wired.com/feed/rss'],
    ['business', 'BBC News', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
    ['business', 'The New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml'],
    ['business', 'CNBC', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
    ['science', 'BBC News', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
    ['science', 'The Guardian', 'https://www.theguardian.com/science/rss'],
    ['science', 'ScienceDaily', 'https://www.sciencedaily.com/rss/top/science.xml'],
    ['health', 'BBC News', 'https://feeds.bbci.co.uk/news/health/rss.xml'],
    ['health', 'The New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml'],
    ['entertainment', 'BBC News', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'],
    ['sports', 'BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml'],
    ['sports', 'ESPN', 'https://www.espn.com/espn/rss/news']
].map(([category, source, url]) => ({ category, source, url }));

const CATEGORIES = ['general', 'technology', 'business', 'science', 'health', 'entertainment', 'sports'];

const feedCache = new TtlCache({ ttlMs: 10 * 60 * 1000, maxEntries: 100 });
const newsApiCache = new TtlCache({ ttlMs: 10 * 60 * 1000, maxEntries: 200 });
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text', processEntities: true, htmlEntities: true });

const textOf = (value) => {
    if (value == null) return '';
    if (Array.isArray(value)) return textOf(value[0]);
    if (typeof value === 'object') return textOf(value['#text'] ?? '');
    return String(value);
};
const stripHtml = (html) => decodeEntities(textOf(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const asArray = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);
const articleId = (url) => crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);

function pickImage(item) {
    const media = [...asArray(item['media:content']), ...asArray(item['media:thumbnail']), ...asArray(item['media:group']?.['media:content'])]
        .filter((m) => m?.['@_url'] && (!m['@_medium'] || m['@_medium'] === 'image') && !/\.(mp4|mp3|m3u8)(\?|$)/i.test(m['@_url']))
        .sort((a, b) => Number(b['@_width'] || 0) - Number(a['@_width'] || 0));
    if (media.length) return media[0]['@_url'];
    const enclosure = asArray(item.enclosure).find((e) => /^image\//.test(e?.['@_type'] || '') || /\.(jpe?g|png|webp)(\?|$)/i.test(e?.['@_url'] || ''));
    if (enclosure) return enclosure['@_url'];
    const html = textOf(item['content:encoded']) + textOf(item.description) + textOf(item.content) + textOf(item.summary);
    return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || null;
}

function linkOf(item) {
    if (typeof item.link === 'string') return item.link.trim();
    const links = asArray(item.link);
    const alternate = links.find((l) => l?.['@_rel'] === 'alternate') || links[0];
    return (alternate?.['@_href'] || textOf(alternate) || textOf(item.guid)).trim();
}

function normalizeItem(item, feed) {
    const url = linkOf(item);
    const title = stripHtml(item.title);
    if (!url || !title) return null;
    const published = textOf(item.pubDate || item['dc:date'] || item.published || item.updated);
    const date = published ? new Date(published) : null;
    const description = stripHtml(item.description || item.summary || item.content || item['content:encoded']).slice(0, 600);
    return {
        id: articleId(url),
        title,
        description,
        content: description,
        url,
        urlToImage: pickImage(item),
        publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
        source: { id: null, name: feed.source },
        author: stripHtml(item['dc:creator'] || item.author?.name || item.author) || null,
        category: feed.category
    };
}

async function fetchFeed(feed) {
    return feedCache.wrap(feed.url, async () => {
        const response = await fetch(feed.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 NewsLens/2.0 (+RSS reader)' },
            signal: AbortSignal.timeout(9000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = parser.parse(await response.text());
        const items = xml?.rss?.channel?.item || xml?.['rdf:RDF']?.item || xml?.feed?.entry || [];
        return asArray(items).slice(0, 40).map((item) => normalizeItem(item, feed)).filter(Boolean);
    }).catch((error) => {
        console.error(`[News] RSS ${feed.source} (${feed.url}) failed: ${error.message}`);
        return [];
    });
}

function matchesQuery(article, query) {
    const haystack = `${article.title} ${article.description}`.toLowerCase();
    return query.split(/\s+OR\s+/i).some((alternative) => {
        const words = alternative.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
        return words.length > 0 && words.every((w) => haystack.includes(w));
    });
}

/** Newest first, but rotating between outlets so one prolific feed cannot fill a whole page. */
function interleaveBySource(articles) {
    const bySource = new Map();
    const newestFirst = [...articles].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    for (const article of newestFirst) {
        const list = bySource.get(article.source.name) || [];
        list.push(article);
        bySource.set(article.source.name, list);
    }
    const queues = [...bySource.values()];
    const out = [];
    while (queues.some((q) => q.length)) {
        for (const queue of queues) if (queue.length) out.push(queue.shift());
    }
    return out;
}

async function fromRss({ q, category, page, pageSize }) {
    const feeds = q ? FEEDS : FEEDS.filter((f) => f.category === (category || 'general'));
    const results = (await Promise.all(feeds.map(fetchFeed))).flat();

    const seen = new Set();
    let articles = results.filter((a) => {
        const key = a.title.toLowerCase();
        if (seen.has(a.url) || seen.has(key)) return false;
        seen.add(a.url);
        seen.add(key);
        return true;
    });
    if (q) articles = articles.filter((a) => matchesQuery(a, q));
    articles = interleaveBySource(articles);

    const start = (page - 1) * pageSize;
    return {
        provider: 'rss',
        articles: articles.slice(start, start + pageSize),
        totalResults: articles.length,
        hasMore: start + pageSize < articles.length
    };
}

async function fromNewsApi({ q, category, page, pageSize }) {
    const params = new URLSearchParams({ pageSize: String(pageSize), page: String(page), apiKey: config.newsApiKey });
    let endpoint = 'top-headlines';
    if (q) {
        endpoint = 'everything';
        params.set('q', q);
        params.set('language', 'en');
        params.set('sortBy', 'publishedAt');
    } else {
        params.set('category', category || 'general');
        params.set('country', process.env.NEWS_COUNTRY || 'us');
    }
    const url = `https://newsapi.org/v2/${endpoint}?${params}`;
    const data = await newsApiCache.wrap(url, async () => {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'NewsLens/2.0' } });
        return response.json();
    });
    if (data.status !== 'ok') {
        const error = new Error(data.message || 'NewsAPI request failed');
        error.code = data.code;
        throw error;
    }
    const articles = data.articles
        .filter((a) => a.title && a.title !== '[Removed]' && a.url)
        .map((a) => ({
            id: articleId(a.url),
            title: a.title,
            description: a.description || '',
            content: a.content || a.description || '',
            url: a.url,
            urlToImage: a.urlToImage,
            publishedAt: a.publishedAt,
            source: { id: a.source?.id || null, name: a.source?.name || 'Unknown' },
            author: a.author,
            category: category || null
        }));
    const reachable = Math.min(data.totalResults, 100); // free plan only exposes the first 100 results
    return { provider: 'newsapi', articles, totalResults: data.totalResults, hasMore: page * pageSize < reachable };
}

/**
 * @param {{ q?: string, category?: string, page?: number, pageSize?: number }} options
 */
async function getNews({ q = '', category = '', page = 1, pageSize = 12 }) {
    const query = { q: q.trim().slice(0, 200), category: CATEGORIES.includes(category) ? category : '', page, pageSize };
    if (config.newsApiKey) {
        try {
            return await fromNewsApi(query);
        } catch (error) {
            if (error.code === 'maximumResultsReached') return { provider: 'newsapi', articles: [], totalResults: 0, hasMore: false };
            console.error(`[News] NewsAPI failed (${error.code || error.message}) - falling back to RSS`);
        }
    }
    return fromRss(query);
}

module.exports = { getNews, CATEGORIES, FEEDS };
