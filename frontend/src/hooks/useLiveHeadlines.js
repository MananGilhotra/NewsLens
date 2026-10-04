import { useEffect, useState } from 'react';
import { api } from '../lib/api';

let cached = null;

/** Current headlines with trust scores from the public feed - fetched once per page load. */
export default function useLiveHeadlines() {
    const [articles, setArticles] = useState([]);
    useEffect(() => {
        let alive = true;
        cached ||= api.get('/news', { params: { pageSize: 24 }, timeout: 15000 })
            .then((r) => r.data.data.articles)
            .catch(() => []);
        cached.then((list) => alive && setArticles(list));
        return () => { alive = false; };
    }, []);

    const outlets = new Set(articles.map((a) => a.source?.name)).size;
    const trustIndex = articles.length ? Math.round(articles.reduce((s, a) => s + a.trustScore, 0) / articles.length) : null;
    return { articles, outlets, trustIndex };
}
