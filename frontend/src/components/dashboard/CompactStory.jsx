import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ScanSearch, ArrowUpRight } from 'lucide-react';
import { TIER_COPY, timeAgo } from '../../lib/verdict';

/** Text-only brief for the front-page sidebar. */
const CompactStory = forwardRef(function CompactStory({ article, index = 0, onFactCheck }, ref) {
    const { tone } = TIER_COPY[article.trustTier] || TIER_COPY.MODERATE;
    return (
        <motion.article
            ref={ref}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group py-4 first:pt-0 last:pb-0"
        >
            <div className="flex items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-wider text-faint">
                <span className="truncate text-muted">{article.source?.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                    <span className={`flex items-center gap-1 ${tone.text}`}><span className={`h-1.5 w-1.5 rounded-full ${tone.bg}`} />{article.trustScore}</span>
                    {timeAgo(article.publishedAt)}
                </span>
            </div>
            <h3 className="mt-2 font-display text-lg leading-snug text-paper">
                <a href={article.url} target="_blank" rel="noreferrer" className="decoration-lens/40 underline-offset-4 group-hover:underline">{article.title}</a>
            </h3>
            <div className="mt-2.5 flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => onFactCheck?.(article)} className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.7rem] text-muted transition-colors hover:bg-white/[0.05] hover:text-paper">
                    <ScanSearch className="h-3 w-3" /> Check
                </button>
                <a href={article.url} target="_blank" rel="noreferrer" className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.7rem] text-muted transition-colors hover:bg-white/[0.05] hover:text-paper">
                    Read <ArrowUpRight className="h-3 w-3" />
                </a>
            </div>
        </motion.article>
    );
});

export default CompactStory;
