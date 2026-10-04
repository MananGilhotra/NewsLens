/**
 * "Today's pulse": trust distribution and headline numbers for the stories currently loaded.
 */

import { motion } from 'framer-motion';
import Counter from '../ui/Counter';

const ease = [0.16, 1, 0.3, 1];
const SEGMENTS = [
    ['VERIFIED', 'Verified', 'bg-real', 'text-real'],
    ['MODERATE', 'Moderate', 'bg-unsure', 'text-unsure'],
    ['CAUTION', 'Caution', 'bg-fake', 'text-fake']
];

export default function FeedPulse({ articles }) {
    if (!articles.length) return null;
    const total = articles.length;
    const counts = Object.fromEntries(SEGMENTS.map(([tier]) => [tier, articles.filter((a) => a.trustTier === tier).length]));
    const average = Math.round(articles.reduce((s, a) => s + a.trustScore, 0) / total);
    const outlets = new Set(articles.map((a) => a.source?.name)).size;

    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="card edge-lit mt-8 grid grid-cols-1 gap-6 p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-10 md:p-6"
            aria-label="Today's pulse"
        >
            <div className="flex items-end gap-4">
                <div>
                    <p className="eyebrow">Avg. trust</p>
                    <p className="mt-1 font-display text-5xl font-light leading-none text-paper"><Counter value={average} /></p>
                </div>
                <div className="mb-1 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[0.68rem] uppercase tracking-wider text-faint">
                    <span>Stories</span><span className="text-paper">{total}</span>
                    <span>Outlets</span><span className="text-paper">{outlets}</span>
                </div>
            </div>
            <div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    {SEGMENTS.map(([tier, , bg], i) => (
                        <motion.div
                            key={tier}
                            className={`h-full ${bg} ${i > 0 ? 'ml-0.5' : ''}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(counts[tier] / total) * 100}%` }}
                            transition={{ duration: 1.2, delay: 0.15 + i * 0.1, ease }}
                        />
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
                    {SEGMENTS.map(([tier, label, bg, text]) => (
                        <span key={tier} className="flex items-center gap-2 text-xs text-muted">
                            <span className={`h-1.5 w-1.5 rounded-full ${bg}`} />
                            {label}
                            <span className={`font-mono ${text}`}>{counts[tier]}</span>
                            <span className="font-mono text-faint">{Math.round((counts[tier] / total) * 100)}%</span>
                        </span>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}
