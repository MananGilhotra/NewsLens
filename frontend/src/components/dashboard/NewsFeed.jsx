/**
 * Live news feed: greeting, today's trust pulse, a front-page lead + briefs, then an infinite grid.
 * Categories, search (also via ?q= from the command palette) and trust filters.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RefreshCw, Loader2, Rss } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import NewsCard from './NewsCard';
import CompactStory from './CompactStory';
import FeedPulse from './FeedPulse';

const CATEGORIES = [['', 'Top stories'], ['technology', 'Tech'], ['business', 'Business'], ['science', 'Science'], ['health', 'Health'], ['entertainment', 'Culture'], ['sports', 'Sports']];
const FILTERS = [['all', 'All'], ['verified', 'Verified'], ['flagged', 'Flagged']];
const PAGE_SIZE = 12;

function greeting() {
    const hour = new Date().getHours();
    return hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function Pills({ items, value, onChange, layoutId, small }) {
    return (
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {items.map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`relative shrink-0 rounded-full px-4 ${small ? 'py-1.5 text-xs' : 'py-2 text-sm'} transition-colors ${value === key ? 'text-ink' : 'text-muted hover:text-paper'}`}
                    aria-pressed={value === key}
                >
                    {value === key && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-paper" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <span className="relative">{label}</span>
                </button>
            ))}
        </div>
    );
}

function Skeleton({ className = '' }) {
    return (
        <div className={`card overflow-hidden ${className}`}>
            <div className="relative aspect-[16/9] overflow-hidden bg-ink-600">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
            </div>
            <div className="space-y-3 p-6">
                <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
                <div className="h-5 w-full rounded bg-white/[0.06]" />
                <div className="h-5 w-4/5 rounded bg-white/[0.06]" />
            </div>
        </div>
    );
}

export default function NewsFeed() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [articles, setArticles] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [provider, setProvider] = useState(null);
    const [category, setCategory] = useState('');
    const [query, setQuery] = useState(() => searchParams.get('q') || '');
    const [input, setInput] = useState(() => searchParams.get('q') || '');
    const [filter, setFilter] = useState('all');
    const sentinel = useRef(null);
    const requestId = useRef(0);
    const urlQuery = searchParams.get('q') || '';

    // Searches started from the command palette arrive as ?q=
    useEffect(() => {
        if (!urlQuery) return;
        setQuery(urlQuery);
        setInput(urlQuery);
        setCategory('');
    }, [urlQuery]);

    const load = useCallback(async (pageNumber) => {
        const id = ++requestId.current;
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const response = await api.get('/news', { params: { q: query || undefined, category: category || undefined, page: pageNumber, pageSize: PAGE_SIZE } });
            if (id !== requestId.current) return; // a newer request superseded this one
            const data = response.data.data;
            setArticles((prev) => {
                if (pageNumber === 1) return data.articles;
                const seen = new Set(prev.map((a) => a.id));
                return [...prev, ...data.articles.filter((a) => !seen.has(a.id))];
            });
            setHasMore(data.hasMore);
            setPage(pageNumber);
            setProvider(data.provider);
        } catch (err) {
            if (id === requestId.current) setError(errorMessage(err, 'Failed to load the news feed'));
        } finally {
            if (id === requestId.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [query, category]);

    useEffect(() => { load(1); }, [load]);

    // Infinite scroll
    useEffect(() => {
        const node = sentinel.current;
        if (!node || !hasMore) return undefined;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !loadingMore && !loading) load(page + 1);
        }, { rootMargin: '600px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, page, load]);

    const visible = articles.filter((a) => filter === 'all' || (filter === 'verified' ? a.trustTier === 'VERIFIED' : a.trustTier === 'CAUTION'));
    const counts = { verified: articles.filter((a) => a.trustTier === 'VERIFIED').length, flagged: articles.filter((a) => a.trustTier === 'CAUTION').length };
    const frontPage = filter === 'all' && !query && visible.length > 4;
    const lead = frontPage ? visible[0] : null;
    const briefs = frontPage ? visible.slice(1, 4) : [];
    const rest = frontPage ? visible.slice(4) : visible;

    const applyQuery = (value) => {
        setQuery(value);
        if (value) setSearchParams({ q: value }, { replace: true });
        else setSearchParams({}, { replace: true });
    };
    const submitSearch = (event) => {
        event.preventDefault();
        applyQuery(input.trim());
    };
    const factCheck = (article) => navigate(`/app/check?url=${encodeURIComponent(article.url)}`);
    const firstName = (user?.name || '').split(/\s+/)[0];

    return (
        <div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{greeting()}{firstName ? `, ${firstName}` : ''}</span>
                        <span className="text-faint">·</span>
                        <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        {provider && <span className="flex items-center gap-1.5 text-faint"><Rss className="h-3 w-3" /> via {provider === 'rss' ? 'publisher RSS' : 'NewsAPI'}</span>}
                    </p>
                    <h1 className="mt-3 font-display text-display-md font-light text-paper">
                        {query ? <>Results for <em className="text-lens">“{query}”</em></> : <>Today’s <em className="text-lens">feed</em></>}
                    </h1>
                </div>
                <form onSubmit={submitSearch} className="relative w-full lg:w-96" role="search">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search topics, people, places…"
                        className="field rounded-full pl-11 pr-11"
                        aria-label="Search news"
                    />
                    {input && (
                        <button type="button" onClick={() => { setInput(''); applyQuery(''); }} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-faint hover:text-paper" aria-label="Clear search">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </form>
            </div>

            {!loading && !error && <FeedPulse articles={articles} />}

            <div className="mt-8 flex flex-col gap-3 border-b border-white/[0.06] pb-5 md:flex-row md:items-center md:justify-between">
                <Pills items={CATEGORIES} value={category} onChange={(c) => { setCategory(c); setInput(''); applyQuery(''); }} layoutId="feed-category" />
                <Pills
                    small
                    items={FILTERS.map(([key, label]) => [key, key === 'all' ? `${label} ${articles.length}` : `${label} ${counts[key]}`])}
                    value={filter}
                    onChange={setFilter}
                    layoutId="feed-filter"
                />
            </div>

            {error && (
                <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-fake/25 bg-fake/[0.06] p-10 text-center">
                    <p className="text-fake">{error}</p>
                    <button type="button" onClick={() => load(1)} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Try again</button>
                </div>
            )}

            {loading ? (
                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="sm:col-span-2" />
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                </div>
            ) : (
                <>
                    {lead && (
                        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            <NewsCard article={lead} featured onFactCheck={factCheck} />
                            <aside className="card edge-lit p-5 md:p-6" aria-label="Also today">
                                <p className="eyebrow mb-4 flex items-center justify-between">Also today <span className="text-faint">{briefs.length} briefs</span></p>
                                <div className="divide-y divide-white/[0.06]">
                                    {briefs.map((article, i) => <CompactStory key={article.id} article={article} index={i} onFactCheck={factCheck} />)}
                                </div>
                            </aside>
                        </div>
                    )}
                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                            {rest.map((article, i) => (
                                <NewsCard key={article.id} article={article} index={i} onFactCheck={factCheck} />
                            ))}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {!loading && !error && visible.length === 0 && (
                <div className="mt-6 rounded-3xl border border-white/[0.07] p-12 text-center text-muted">
                    {articles.length ? 'No articles match this filter yet.' : 'No stories found - try another search.'}
                </div>
            )}

            <div ref={sentinel} className="flex h-24 items-center justify-center">
                {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-lens" />}
                {!hasMore && !loading && articles.length > 0 && <span className="eyebrow">You’re all caught up</span>}
            </div>
        </div>
    );
}
