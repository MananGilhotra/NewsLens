/**
 * Source reputation lookup by outlet name or domain.
 * Deterministic: the same source always gets the same score.
 *
 * 1. Hand-curated tiers below (names + domains, includes satire)
 * 2. 5.3k domains from the News Media Reliability dataset (Burdisso et al., NAACL 2024) - data/domain-reliability.json
 */

const DOMAIN_INDEX = require('../data/domain-reliability.json').domains;
const INDEX_TIERS = {
    1: { tier: 'reliable', score: 82, label: 'Rated generally reliable' },
    0: { tier: 'mixed', score: 55, label: 'Rated mixed reliability' },
    '-1': { tier: 'unreliable', score: 22, label: 'Rated generally unreliable' }
};

const TIERS = {
    high: {
        score: 90,
        label: 'Established outlet',
        sources: [
            ['Reuters', 'reuters.com'], ['Associated Press', 'apnews.com'], ['AP News', 'apnews.com'], ['AFP', 'afp.com'],
            ['BBC', 'bbc.com'], ['BBC News', 'bbc.co.uk'], ['The Guardian', 'theguardian.com'], ['The New York Times', 'nytimes.com'],
            ['The Washington Post', 'washingtonpost.com'], ['NPR', 'npr.org'], ['PBS', 'pbs.org'], ['The Wall Street Journal', 'wsj.com'],
            ['Financial Times', 'ft.com'], ['The Economist', 'economist.com'], ['Bloomberg', 'bloomberg.com'],
            ['Al Jazeera English', 'aljazeera.com'], ['Al Jazeera', 'aljazeera.com'], ['Deutsche Welle', 'dw.com'], ['DW', 'dw.com'],
            ['France 24', 'france24.com'], ['The Hindu', 'thehindu.com'], ['The Indian Express', 'indianexpress.com'],
            ['NDTV', 'ndtv.com'], ['Times of India', 'timesofindia.indiatimes.com'], ['Nature', 'nature.com'],
            ['Science', 'science.org'], ['Scientific American', 'scientificamerican.com'], ['ProPublica', 'propublica.org'],
            ['CBC News', 'cbc.ca'], ['ABC News (AU)', 'abc.net.au'], ['The Times', 'thetimes.co.uk'], ['Le Monde', 'lemonde.fr']
        ]
    },
    mid: {
        score: 74,
        label: 'Mainstream outlet',
        sources: [
            ['CNN', 'cnn.com'], ['ABC News', 'abcnews.go.com'], ['CBS News', 'cbsnews.com'], ['NBC News', 'nbcnews.com'],
            ['MSNBC', 'msnbc.com'], ['Sky News', 'news.sky.com'], ['USA Today', 'usatoday.com'], ['Los Angeles Times', 'latimes.com'],
            ['Chicago Tribune', 'chicagotribune.com'], ['Axios', 'axios.com'], ['Politico', 'politico.com'], ['The Atlantic', 'theatlantic.com'],
            ['Wired', 'wired.com'], ['Ars Technica', 'arstechnica.com'], ['TechCrunch', 'techcrunch.com'], ['The Verge', 'theverge.com'],
            ['Business Insider', 'businessinsider.com'], ['Forbes', 'forbes.com'], ['Fortune', 'fortune.com'], ['CNBC', 'cnbc.com'],
            ['Hindustan Times', 'hindustantimes.com'], ['India Today', 'indiatoday.in'], ['News18', 'news18.com'],
            ['Scroll.in', 'scroll.in'], ['The Wire', 'thewire.in'], ['The Hill', 'thehill.com'], ['Time', 'time.com'],
            ['Newsweek', 'newsweek.com'], ['Fox News', 'foxnews.com'], ['The Independent', 'independent.co.uk'],
            ['Engadget', 'engadget.com'], ['Yahoo News', 'news.yahoo.com'], ['The Telegraph', 'telegraph.co.uk'],
            ['ESPN', 'espn.com'], ['BBC Sport', 'bbc.co.uk/sport'], ['ScienceDaily', 'sciencedaily.com'], ['Variety', 'variety.com'],
            ['The Hollywood Reporter', 'hollywoodreporter.com'], ['Mint', 'livemint.com'], ['Moneycontrol', 'moneycontrol.com']
        ]
    },
    low: {
        score: 32,
        label: 'Tabloid or hyper-partisan',
        sources: [
            ['Daily Mail', 'dailymail.co.uk'], ['The Sun', 'thesun.co.uk'], ['New York Post', 'nypost.com'], ['Daily Mirror', 'mirror.co.uk'],
            ['The Daily Star', 'dailystar.co.uk'], ['Breitbart', 'breitbart.com'], ['The Gateway Pundit', 'thegatewaypundit.com'],
            ['OAN', 'oann.com'], ['Newsmax', 'newsmax.com'], ['Daily Express', 'express.co.uk'], ['RT', 'rt.com'],
            ['Sputnik', 'sputnikglobe.com'], ['The Daily Wire', 'dailywire.com'], ['Occupy Democrats', 'occupydemocrats.com'],
            ['Palmer Report', 'palmerreport.com'], ['Zero Hedge', 'zerohedge.com'], ['OpIndia', 'opindia.com']
        ]
    },
    unreliable: {
        score: 8,
        label: 'Known misinformation source',
        sources: [
            ['InfoWars', 'infowars.com'], ['Natural News', 'naturalnews.com'], ['Before It\'s News', 'beforeitsnews.com'],
            ['World News Daily Report', 'worldnewsdailyreport.com'], ['YourNewsWire', 'yournewswire.com'],
            ['NewsPunch', 'newspunch.com'], ['Global Research', 'globalresearch.ca'],
            ['Daily Buzz Live', 'dailybuzzlive.com'], ['Empire News', 'empirenews.net'], ['Now8News', 'now8news.com']
        ]
    },
    satire: {
        score: 10,
        label: 'Satire - not real news',
        sources: [
            ['The Onion', 'theonion.com'], ['The Babylon Bee', 'babylonbee.com'], ['ClickHole', 'clickhole.com'],
            ['The Beaverton', 'thebeaverton.com'], ['Waterford Whispers News', 'waterfordwhispersnews.com'],
            ['The Daily Mash', 'thedailymash.co.uk'], ['Faking News', 'fakingnews.com']
        ]
    }
};

const byDomain = new Map();
const byName = new Map();
for (const [tier, { score, label, sources }] of Object.entries(TIERS)) {
    for (const [name, domain] of sources) {
        const entry = { tier, score, label, name, domain };
        if (!byDomain.has(domain)) byDomain.set(domain, entry);
        if (!byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), entry);
    }
}

const normalizeDomain = (value) => {
    try {
        const host = value.includes('://') ? new URL(value).hostname : value;
        return host.toLowerCase().replace(/^www\./, '').replace(/^amp\./, '').replace(/^m\./, '');
    } catch {
        return '';
    }
};

/** Looks a source up by domain/URL first, then by outlet name. Returns null for unknown sources. */
function lookup({ url, domain, name } = {}) {
    const host = normalizeDomain(domain || url || '');
    if (host) {
        const parts = host.split('.');
        const candidates = parts.slice(0, -1).map((_, i) => parts.slice(i).join('.'));
        for (const candidate of candidates) {
            const hit = byDomain.get(candidate);
            if (hit) return { ...hit, matchedBy: 'domain' };
        }
        for (const candidate of candidates) {
            const entry = DOMAIN_INDEX[candidate];
            if (!entry) continue;
            const [label, newsguard] = entry;
            const base = INDEX_TIERS[label];
            const score = newsguard == null ? base.score : Math.round((base.score + newsguard) / 2);
            return { ...base, score, name: candidate, domain: candidate, newsguard, matchedBy: 'reliability-index' };
        }
    }
    if (name) {
        const key = name.toLowerCase().trim();
        if (byName.has(key)) return { ...byName.get(key), matchedBy: 'name' };
        for (const [known, entry] of byName) {
            if (known.length > 4 && key.includes(known)) return { ...entry, matchedBy: 'name' };
        }
    }
    return null;
}

/** Number of distinct outlets the index can rate. */
const count = () => new Set([...byDomain.keys(), ...Object.keys(DOMAIN_INDEX)]).size;

module.exports = { lookup, normalizeDomain, count, TIERS };
