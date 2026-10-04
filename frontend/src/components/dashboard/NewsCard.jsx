/**
 * News card: image, headline, trust meter, expandable 3-point summary and a one-tap fact-check.
 */

import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ScanSearch, ArrowUpRight, Loader2, ChevronUp } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { timeAgo } from '../../lib/verdict';
import TrustMeter from './TrustMeter';
import { useToast } from '../ui/Toast';

const ease = [0.16, 1, 0.3, 1];

function hueFor(text) {
    let hash = 0;
    for (const ch of text || 'x') hash = (hash * 31 + ch.charCodeAt(0)) % 360;
    return hash;
}

function CardImage({ article }) {
    const [failed, setFailed] = useState(false);
    const hue = hueFor(article.source?.name);
    if (!article.urlToImage || failed) {
        return (
            <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(circle at 30% 20%, hsl(${hue} 45% 22%), #0c0e13 70%)` }}>
                <span className="font-display text-7xl font-light italic text-paper/25">{(article.source?.name || 'N')[0]}</span>
            </div>
        );
    }
    return (
        <img
            src={article.urlToImage}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.06]"
        />
    );
}

const NewsCard = forwardRef(function NewsCard({ article, index = 0, featured = false, onFactCheck }, ref) {
    const [summary, setSummary] = useState(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const toast = useToast();

    const summarize = async () => {
        if (summary) {
            setOpen((o) => !o);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/news/summarize', {
                title: article.title,
                content: article.content || article.description,
                url: article.url
            });
            setSummary(response.data.data);
            setOpen(true);
        } catch (err) {
            setError(errorMessage(err, 'Could not summarise this article'));
            toast(errorMessage(err, 'Could not summarise this article'), { tone: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const trust = article.trust || {};

    return (
        <motion.article
            ref={ref}
            layout
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.7, delay: (index % 12) * 0.05, ease, layout: { duration: 0.5, ease } }}
            className={`group card flex flex-col overflow-hidden transition-colors duration-300 hover:border-white/[0.14] ${featured ? 'lg:col-span-2 lg:flex-row' : ''}`}
        >
            <div className={`relative overflow-hidden bg-ink-600 ${featured ? 'aspect-[16/9] lg:aspect-auto lg:w-[55%]' : 'aspect-[16/9]'}`}>
                <CardImage article={article} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-700/80 via-transparent to-transparent" />
                {article.category && <span className="chip absolute left-4 top-4 border-white/15 bg-ink/60 backdrop-blur">{article.category}</span>}
            </div>

            <div className={`flex flex-1 flex-col p-5 md:p-6 ${featured ? 'lg:p-8' : ''}`}>
                <div className="flex items-center justify-between gap-3 font-mono text-[0.68rem] uppercase tracking-wider text-faint">
                    <span className="truncate text-muted">{article.source?.name}</span>
                    <span className="shrink-0">{timeAgo(article.publishedAt)}</span>
                </div>
                <h3 className={`mt-3 font-display leading-snug text-paper ${featured ? 'text-3xl md:text-4xl' : 'line-clamp-3 text-[1.35rem]'}`}>
                    <a href={article.url} target="_blank" rel="noreferrer" className="decoration-lens/40 underline-offset-4 hover:underline">{article.title}</a>
                </h3>
                {article.description && (
                    <p className={`mt-3 text-sm leading-relaxed text-muted ${featured ? 'line-clamp-4' : 'line-clamp-2'}`}>{article.description}</p>
                )}

                <AnimatePresence initial={false}>
                    {open && summary && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5, ease }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 rounded-2xl border border-lens/15 bg-lens/[0.04] p-4">
                                <div className="mb-2.5 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-wider text-lens">
                                    <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> {summary.engine === 'llm' ? 'AI summary' : 'Key sentences'}</span>
                                    <span className="text-faint">{summary.basis === 'full-article' ? 'from full article' : 'from snippet'}</span>
                                </div>
                                <ul className="space-y-2">
                                    {summary.summary.map((line, i) => (
                                        <motion.li
                                            key={line}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease }}
                                            className="flex gap-2.5 text-sm leading-relaxed text-paper-dim"
                                        >
                                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lens" /> {line}
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {error && <p className="mt-3 text-xs text-fake">{error}</p>}

                <div className="mt-auto pt-5">
                <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
                    <TrustMeter score={article.trustScore} tier={article.trustTier} />
                    {(trust.source || trust.model) && (
                        <span className="hidden font-mono text-[0.62rem] text-faint xl:inline">
                            {trust.source ? `src ${trust.source.score}` : 'src ?'} · model {trust.model?.score ?? '?'}
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        <button type="button" onClick={summarize} disabled={loading} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted transition-colors hover:bg-white/[0.05] hover:text-paper" aria-label="Summarise article">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : open ? <ChevronUp className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{open ? 'Hide' : 'Summary'}</span>
                        </button>
                        <button type="button" onClick={() => onFactCheck?.(article)} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted transition-colors hover:bg-white/[0.05] hover:text-paper" aria-label="Fact-check article">
                            <ScanSearch className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Check</span>
                        </button>
                        <a href={article.url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.05] hover:text-paper" aria-label="Open original article">
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
                </div>
            </div>
        </motion.article>
    );
});

export default NewsCard;
