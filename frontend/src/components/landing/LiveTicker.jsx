/**
 * "Live wire": real headlines from the feed, each with its trust score, drifting past.
 */

import { toneForScore } from '../../lib/verdict';

export default function LiveTicker({ articles }) {
    if (!articles.length) return <div className="h-[46px] border-t border-white/[0.08]" />;
    return (
        <div className="relative flex items-stretch border-t border-white/[0.08] bg-ink/60 backdrop-blur-md">
            <div className="flex shrink-0 items-center gap-2.5 border-r border-white/[0.08] px-4 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-fake md:px-6">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fake opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-fake" />
                </span>
                Live wire
            </div>
            <div className="group flex min-w-0 flex-1 overflow-hidden mask-fade-x">
                <ul className="flex w-max animate-marquee items-center gap-12 py-3 pr-12 group-hover:[animation-play-state:paused]" style={{ '--marquee-duration': `${Math.max(60, articles.length * 7)}s` }}>
                    {[...articles, ...articles].map((article, i) => {
                        const tone = toneForScore(article.trustScore, { high: 70, low: 44 });
                        return (
                            <li key={`${article.id}-${i}`} aria-hidden={i >= articles.length}>
                                <a href={article.url} target="_blank" rel="noreferrer" tabIndex={i >= articles.length ? -1 : 0} data-cursor="Read"
                                    className="flex items-center gap-3 whitespace-nowrap text-sm text-paper/75 transition-colors hover:text-paper">
                                    <span className={`font-mono text-xs tabular-nums ${tone.text}`}>{article.trustScore}</span>
                                    <span className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">{article.source?.name}</span>
                                    <span className="font-display text-[1.02rem]">{article.title}</span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
