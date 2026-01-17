/**
 * NewsFeed.jsx - No GSAP, CSS Only
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

// Simple loading overlay
const LoadingOverlay = ({ isActive }) => {
    if (!isActive) return null;
    return (
        <div className="absolute inset-0 z-10 bg-cyber-darker/90 flex items-center justify-center">
            <div className="text-glow-cyan text-sm font-mono animate-pulse">Loading...</div>
        </div>
    );
};

// News Card Component
const NewsCard = ({ article }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState(null);

    const handleSummarize = async () => {
        if (isLoading || summary) return;
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/news/summarize`, {
                title: article.title,
                content: article.content || article.description
            });

            if (response.data.success) {
                setSummary(response.data.data.summary);
            }
        } catch (error) {
            console.error('Summary failed:', error);
            setSummary(['• Summary unavailable', '• Try again', '• Check connection']);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className="cyber-card relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] h-full flex flex-col"
        >
            <LoadingOverlay isActive={isLoading} />

            {/* Image */}
            {article.urlToImage && (
                <div className="h-40 overflow-hidden">
                    <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyber-darker via-transparent to-transparent" />
                </div>
            )}

            {/* Trust Badge */}
            <div className={`absolute top-3 right-3 z-20 px-2 py-1 text-xs font-display tracking-wider
                ${article.trustTier === 'VERIFIED'
                    ? 'border border-glow-cyan text-glow-cyan bg-glow-cyan/10'
                    : article.trustTier === 'CAUTION'
                        ? 'border border-glow-red text-glow-red bg-glow-red/10'
                        : 'border border-glow-yellow text-glow-yellow bg-glow-yellow/10'
                }`}
            >
                {article.trustTier === 'VERIFIED' && '◉ '}
                {article.trustTier === 'CAUTION' && '⚠ '}
                {article.trustTier}
            </div>

            {/* Content */}
            <div className="p-4 relative z-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                    <span className={article.isTrusted ? 'text-glow-cyan' : 'text-text-muted'}>
                        {article.source.name}
                    </span>
                    <span>{formatDate(article.publishedAt)}</span>
                </div>

                <h3 className="font-display text-sm md:text-base mb-2 line-clamp-2 group-hover:text-glow-cyan transition-colors duration-300">
                    {article.title}
                </h3>

                {summary ? (
                    <div className="space-y-1 text-sm text-text-secondary animate-fade-in">
                        {summary.map((bullet, i) => (
                            <p key={i} className="text-glow-green">{bullet}</p>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-text-muted line-clamp-2 mb-3">
                        {article.description}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-cyber-border">
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1 rounded-full overflow-hidden bg-cyber-card">
                            <div
                                className={`h-full transition-all duration-300 ${article.trustScore >= 70 ? 'bg-glow-green' :
                                    article.trustScore >= 40 ? 'bg-glow-yellow' : 'bg-glow-red'
                                    }`}
                                style={{ width: `${article.trustScore}%` }}
                            />
                        </div>
                        <span className="text-xs text-text-muted">{article.trustScore}%</span>
                    </div>

                    <button
                        onClick={handleSummarize}
                        disabled={isLoading || !!summary}
                        className={`text-xs px-3 py-1 border transition-all duration-300
                            ${summary
                                ? 'border-glow-green/30 text-glow-green/50 cursor-default'
                                : 'border-glow-purple/50 text-glow-purple hover:bg-glow-purple/10 hover:border-glow-purple'
                            }`}
                    >
                        {isLoading ? '⏳ Loading...' : summary ? '✓ Done' : '📝 Summarize'}
                    </button>
                </div>

                <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3 text-xs text-glow-cyan/50 hover:text-glow-cyan transition-colors duration-300"
                >
                    Read full article →
                </a>
            </div>
        </div>
    );
};

// Main NewsFeed Component
const NewsFeed = () => {
    const [articles, setArticles] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('world news');

    const fetchNews = async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const response = await axios.get(`${API_URL}/news`, {
                params: { q: searchQuery, page: pageNum, pageSize: 12 }
            });

            if (response.data.success) {
                const newArticles = response.data.data.articles;
                if (append) {
                    setArticles(prev => [...prev, ...newArticles]);
                } else {
                    setArticles(newArticles);
                }
                setHasMore(response.data.data.hasMore);
                setPage(pageNum);
            }
        } catch (err) {
            console.error('Failed to fetch news:', err);
            setError('Failed to load news feed');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchNews(1);
    }, [searchQuery]);

    useEffect(() => {
        let filtered;
        switch (filter) {
            case 'trusted':
                filtered = articles.filter(a => a.trustScore >= 70);
                break;
            case 'caution':
                filtered = articles.filter(a => a.trustScore < 40);
                break;
            default:
                filtered = articles;
        }
        setFilteredArticles(filtered);
    }, [filter, articles]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchNews(page + 1, true);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const query = e.target.search.value.trim();
        if (query) setSearchQuery(query);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 border-2 border-glow-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-display text-glow-cyan animate-pulse">Loading news...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="font-display text-3xl md:text-4xl glow-text-cyan mb-2">News Feed</h2>
                <p className="text-text-muted text-sm">Real-time news with AI reliability scores</p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-6">
                <div className="flex gap-2">
                    <input
                        type="text"
                        name="search"
                        defaultValue={searchQuery}
                        placeholder="Search news topics..."
                        className="cyber-input flex-1"
                    />
                    <button type="submit" className="cyber-button px-6">Search</button>
                </div>
            </form>

            {/* Filters */}
            <div className="flex justify-center gap-3 mb-8 flex-wrap">
                {[
                    { id: 'all', label: 'All', count: articles.length },
                    { id: 'trusted', label: 'Trusted', count: articles.filter(a => a.trustScore >= 70).length },
                    { id: 'caution', label: 'Flagged', count: articles.filter(a => a.trustScore < 40).length }
                ].map(({ id, label, count }) => (
                    <button
                        key={id}
                        onClick={() => setFilter(id)}
                        className={`px-4 py-2 text-xs font-display tracking-wider border transition-all duration-300
                            ${filter === id
                                ? 'border-glow-cyan bg-glow-cyan/10 text-glow-cyan'
                                : 'border-cyber-border text-text-muted hover:border-glow-cyan/50 hover:text-text-secondary'
                            }`}
                    >
                        {label} ({count})
                    </button>
                ))}
            </div>

            {error && (
                <div className="cyber-card glow-border-red p-4 mb-6 text-center">
                    <span className="text-glow-red">⚠ {error}</span>
                </div>
            )}

            {/* Grid - Equal sized cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                    <NewsCard key={article.id} article={article} />
                ))}
            </div>

            {filteredArticles.length === 0 && !loading && (
                <div className="text-center py-16">
                    <p className="text-text-muted text-lg">No articles match current filter</p>
                    <button onClick={() => setFilter('all')} className="mt-4 text-glow-cyan hover:underline">
                        Clear filters
                    </button>
                </div>
            )}

            {hasMore && filteredArticles.length > 0 && (
                <div className="text-center mt-8">
                    <button onClick={handleLoadMore} disabled={loadingMore} className="cyber-button">
                        {loadingMore ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin">◐</span> LOADING...
                            </span>
                        ) : '↓ Load More'}
                    </button>
                </div>
            )}

            {/* Stats */}
            <div className="mt-8 pt-6 border-t border-cyber-border grid grid-cols-3 gap-4 text-center text-xs">
                <div className="cyber-card p-3">
                    <div className="text-glow-cyan font-display text-lg">{articles.length}</div>
                    <div className="text-text-muted">ARTICLES</div>
                </div>
                <div className="cyber-card p-3">
                    <div className="text-glow-green font-display text-lg">{articles.filter(a => a.trustScore >= 70).length}</div>
                    <div className="text-text-muted">VERIFIED</div>
                </div>
                <div className="cyber-card p-3">
                    <div className="text-glow-red font-display text-lg">{articles.filter(a => a.trustScore < 40).length}</div>
                    <div className="text-text-muted">FLAGGED</div>
                </div>
            </div>
        </div>
    );
};

export default NewsFeed;
