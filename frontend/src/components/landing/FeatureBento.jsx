/**
 * Feature bento grid - each tile carries a small live demo of the feature.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Link2, ScanFace, Sparkles, ListTree, ShieldCheck } from 'lucide-react';
import SpotlightCard from '../ui/SpotlightCard';
import SplitReveal from '../ui/SplitReveal';
import SectionLabel from '../ui/SectionLabel';

const ease = [0.16, 1, 0.3, 1];
const tileMotion = (i) => ({
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-8%' },
    transition: { duration: 0.9, delay: i * 0.08, ease }
});

const FEED = [
    { source: 'The Harbor Times', title: 'Central bank holds rates as inflation cools', score: 93 },
    { source: 'dailytruth-news.co', title: 'Miracle fruit cures everything, insiders say', score: 8 },
    { source: 'The Civic Ledger', title: 'Parliament to debate new data-protection bill', score: 88 },
    { source: 'viral-buzz.net', title: 'You won’t believe what was found in the ocean', score: 21 }
];

function MiniRing({ score }) {
    const color = score >= 60 ? '#34D399' : score <= 40 ? '#FB7185' : '#FBBF24';
    const c = 2 * Math.PI * 15;
    return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <motion.circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c}
                initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - score / 100) }} viewport={{ once: true }} transition={{ duration: 1.4, ease }} />
        </svg>
    );
}

function FeedDemo() {
    const [active, setActive] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setActive((a) => (a + 1) % FEED.length), 2200);
        return () => clearInterval(timer);
    }, []);
    return (
        <ul className="mt-8 space-y-2.5">
            {FEED.map((item, i) => (
                <li key={item.title} className="relative flex items-center gap-4 rounded-2xl px-4 py-3">
                    {active === i && (
                        <motion.span layoutId="feed-demo-active" className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.04]" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                    )}
                    <MiniRing score={item.score} />
                    <div className="relative min-w-0">
                        <div className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">{item.source}</div>
                        <div className="truncate font-display text-lg text-paper">{item.title}</div>
                    </div>
                    <span className={`relative ml-auto font-mono text-sm ${item.score >= 60 ? 'text-real' : item.score <= 40 ? 'text-fake' : 'text-unsure'}`}>{item.score}</span>
                </li>
            ))}
        </ul>
    );
}

const URLS = ['bbc.com/news/science-6612…', 'totally-real-news.biz/shock…', 'apnews.com/article/elect…'];
function LinkDemo() {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setIndex((i) => (i + 1) % URLS.length), 2600);
        return () => clearInterval(timer);
    }, []);
    const fake = index === 1;
    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/60 px-3 py-2.5 font-mono text-xs text-muted">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-lens" />
                <AnimatePresence mode="wait">
                    <motion.span key={index} initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: 'linear' }} className="truncate">
                        https://{URLS[index]}
                    </motion.span>
                </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 1, duration: 0.5 } }} exit={{ opacity: 0 }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider ${fake ? 'border-fake/40 text-fake' : 'border-real/40 text-real'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${fake ? 'bg-fake' : 'bg-real'}`} /> {fake ? 'Likely fake · 12' : 'Credible · 91'}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function ForensicsDemo() {
    return (
        <div className="relative mt-6 h-36 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_35%,#2a3142,#0c0e13_70%)]">
            <div className="absolute left-1/2 top-6 h-16 w-16 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#3a4256] to-[#232836]" />
            <div className="absolute bottom-0 left-1/2 h-14 w-32 -translate-x-1/2 rounded-t-[3rem] bg-gradient-to-b from-[#343b4e] to-[#1c202b]" />
            <motion.div className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-violet/40 to-transparent"
                animate={{ y: ['-30%', '330%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }} />
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 font-mono text-[0.6rem] uppercase">
                <span className="rounded bg-ink/80 px-1.5 py-0.5 text-real">EXIF · Canon</span>
                <span className="rounded bg-ink/80 px-1.5 py-0.5 text-muted">C2PA · none</span>
                <span className="rounded bg-ink/80 px-1.5 py-0.5 text-real">AI tag · none</span>
            </div>
        </div>
    );
}

const CUES = [['breaking', 'fake'], ['said on tuesday', 'real'], ['!!!', 'fake'], ['according to', 'real'], ['share before', 'fake'], ['officials said', 'real'], ['shocking', 'fake'], ['the ministry', 'real']];
function CuesDemo() {
    return (
        <div className="mt-6 flex flex-wrap gap-2">
            {CUES.map(([cue, tone], i) => (
                <motion.span key={cue} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 380, damping: 22 }}
                    className={`rounded-full border px-3 py-1 font-mono text-xs ${tone === 'fake' ? 'border-fake/30 bg-fake/10 text-fake' : 'border-real/30 bg-real/10 text-real'}`}>
                    {tone === 'fake' ? '+' : '−'} {cue}
                </motion.span>
            ))}
        </div>
    );
}

const BULLETS = ['The city council approved funding for three new public libraries on Monday.', 'Construction is expected to start next spring and finish within two years.', 'Officials said the plan is covered by the existing budget, with no tax rise.'];
function SummaryDemo() {
    return (
        <ul className="mt-6 space-y-2.5">
            {BULLETS.map((b, i) => (
                <motion.li key={b} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.18, duration: 0.7, ease }}
                    className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lens" /> {b}
                </motion.li>
            ))}
        </ul>
    );
}

export default function FeatureBento() {
    return (
        <section id="features" className="relative border-t border-white/[0.06] bg-ink py-28 md:py-36">
            <div className="mx-auto max-w-[90rem] px-6 md:px-12">
                <SectionLabel index={6}>What you get</SectionLabel>
                <SplitReveal className="mt-10 max-w-3xl font-display text-display-md font-light text-paper">
                    Everything you need to <em className="text-lens">read critically.</em>
                </SplitReveal>

                <div className="mt-16 grid grid-cols-1 auto-rows-auto gap-4 md:grid-cols-6">
                    <motion.div {...tileMotion(0)} className="md:col-span-4 md:row-span-2">
                        <SpotlightCard className="h-full p-7 md:p-9">
                            <Radio className="h-5 w-5 text-lens" strokeWidth={1.75} />
                            <h3 className="mt-5 font-display text-3xl text-paper">A live feed that scores itself</h3>
                            <p className="mt-2 max-w-lg text-muted">Fresh stories from dozens of outlets, each with a trust score that blends source reputation with our model’s read of the headline.</p>
                            <FeedDemo />
                            <p className="mt-6 border-t border-white/[0.06] pt-5 font-mono text-[0.65rem] uppercase tracking-wider text-faint">
                                Refreshed every 10 minutes · NewsAPI or 29 publisher RSS feeds · no key required
                            </p>
                        </SpotlightCard>
                    </motion.div>
                    <motion.div {...tileMotion(1)} className="md:col-span-2">
                        <SpotlightCard className="h-full p-7">
                            <ShieldCheck className="h-5 w-5 text-lens" strokeWidth={1.75} />
                            <h3 className="mt-5 text-xl font-medium text-paper">Fact-check text or links</h3>
                            <p className="mt-1.5 text-sm text-muted">Paste a claim or drop a URL - the full article is fetched and analysed.</p>
                            <LinkDemo />
                        </SpotlightCard>
                    </motion.div>
                    <motion.div {...tileMotion(2)} className="md:col-span-2">
                        <SpotlightCard className="h-full p-7" color="rgba(167,139,250,0.14)">
                            <ScanFace className="h-5 w-5 text-violet" strokeWidth={1.75} />
                            <h3 className="mt-5 text-xl font-medium text-paper">Deepfake forensics</h3>
                            <p className="mt-1.5 text-sm text-muted">Metadata provenance checks plus a visual AI inspection of faces, hands and lighting.</p>
                            <ForensicsDemo />
                        </SpotlightCard>
                    </motion.div>
                    <motion.div {...tileMotion(3)} className="md:col-span-3">
                        <SpotlightCard className="h-full p-7">
                            <ListTree className="h-5 w-5 text-lens" strokeWidth={1.75} />
                            <h3 className="mt-5 text-xl font-medium text-paper">Explainable, not a black box</h3>
                            <p className="mt-1.5 text-sm text-muted">See the exact phrases that pushed a score up or down.</p>
                            <CuesDemo />
                        </SpotlightCard>
                    </motion.div>
                    <motion.div {...tileMotion(4)} className="md:col-span-3">
                        <SpotlightCard className="h-full p-7">
                            <Sparkles className="h-5 w-5 text-lens" strokeWidth={1.75} />
                            <h3 className="mt-5 text-xl font-medium text-paper">Summaries in one tap</h3>
                            <p className="mt-1.5 text-sm text-muted">Three faithful bullet points from the full article - with or without an AI key.</p>
                            <SummaryDemo />
                        </SpotlightCard>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
