/**
 * Model card: real held-out metrics from /api/model, including the weak spots.
 */

import { motion } from 'framer-motion';
import useModelInfo, { trainingSamples } from '../../hooks/useModelInfo';
import Counter from '../ui/Counter';
import SplitReveal from '../ui/SplitReveal';
import SectionLabel from '../ui/SectionLabel';

const SOURCE_LABELS = [
    ['welfake_article', 'Full news articles', 'WELFake'],
    ['welfake_title', 'Headlines only', 'WELFake'],
    ['ccnews_article', 'Articles from outlets never seen in training', 'CC-News'],
    ['ccnews_title', 'Headlines from outlets never seen in training', 'CC-News'],
    ['politifact', 'Political claims', 'PolitiFact'],
    ['gossipcop', 'Celebrity gossip', 'GossipCop']
];

const pct = (v) => (v == null ? null : Math.round(v * 1000) / 10);
const fmt = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);

export default function StatsSection() {
    const info = useModelInfo();
    const test = info?.metrics?.test || {};
    const live = info?.metrics?.liveHeadlines;
    const samples = trainingSamples(info);

    const stats = [
        { value: pct(test.welfake_article?.accuracy), decimals: 1, suffix: '%', label: `accuracy on ${test.welfake_article?.n?.toLocaleString() || 'held-out'} unseen news articles` },
        { value: test.overall?.rocAuc ?? null, decimals: 3, label: `ROC-AUC across ${test.overall?.n?.toLocaleString() || 'all'} held-out samples` },
        { value: pct(test.ccnews_article?.accuracy), decimals: 1, suffix: '%', label: 'of genuine articles from never-seen outlets correctly cleared' },
        { value: live ? Math.round((1 - live.flaggedFakeShare) * 1000) / 10 : null, decimals: 1, suffix: '%', label: live ? `of ${live.n} current headlines from ${live.outlets} major outlets cleared` : 'of current headlines from major outlets cleared' }
    ];

    return (
        <section id="model" className="relative border-t border-white/[0.06] bg-ink py-28 md:py-36">
            <div className="mx-auto max-w-[90rem] px-6 md:px-12">
                <SectionLabel index={5} aside={info?.version ? `Model v${info.version}` : undefined}>The model card</SectionLabel>
                <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
                    <div>
                        <SplitReveal className="font-display text-display-md font-light text-paper">
                            Measured, <em className="text-lens">not marketed.</em>
                        </SplitReveal>
                    </div>
                    <p className="max-w-xl text-pretty leading-relaxed text-muted lg:justify-self-end">
                        Every number below is computed on data the model never saw while training
                        {samples ? ` (it learned from ${samples.toLocaleString()} labelled samples)` : ''}. Shortcuts that make public
                        datasets look easy - wire-service datelines, image credits, outlet names - were removed first, so the
                        scores reflect writing, not watermarks.
                    </p>
                </div>

                <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.label} className="bg-ink p-7 md:p-9">
                            <div className="font-display text-5xl font-light text-paper md:text-6xl">
                                <Counter value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                            </div>
                            <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-muted">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
                    <div>
                        <p className="eyebrow mb-5">Accuracy by source (held-out test split)</p>
                        <ul className="divide-y divide-white/[0.06]">
                            {SOURCE_LABELS.map(([key, label, dataset], i) => {
                                const m = test[key];
                                const acc = pct(m?.accuracy);
                                return (
                                    <li key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 md:grid-cols-[1.3fr_1fr_9.5rem]">
                                        <div>
                                            <div className="text-[0.95rem] text-paper">{label}</div>
                                            <div className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">{dataset}{m?.n ? ` · n=${m.n.toLocaleString()}` : ''}</div>
                                        </div>
                                        <div className="order-3 col-span-2 h-1 overflow-hidden rounded-full bg-white/[0.06] md:order-none md:col-span-1">
                                            <motion.div
                                                className={`h-full origin-left rounded-full ${acc >= 85 ? 'bg-real' : acc >= 75 ? 'bg-lens' : 'bg-unsure'}`}
                                                initial={{ scaleX: 0 }}
                                                whileInView={{ scaleX: (acc || 0) / 100 }}
                                                viewport={{ once: true, margin: '-10%' }}
                                                transition={{ duration: 1.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                            />
                                        </div>
                                        <div className="text-right font-mono text-sm text-paper">
                                            {fmt(acc)}
                                            {m?.rocAuc != null && <span className="ml-2 text-faint">AUC {m.rocAuc.toFixed(2)}</span>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <aside className="card h-fit p-7">
                        <p className="eyebrow mb-4">Why four signals</p>
                        <p className="leading-relaxed text-muted">
                            A language model can only judge <em className="font-display text-paper">how</em> something is written. Short gossip
                            headlines and polished lies are its weak spots - you can see it in the table. That is why NewsLens weighs the
                            model against an AI fact-check of the actual claims, the reputation of the outlet, and published fact-checks
                            before it gives you a verdict.
                        </p>
                        {info?.datasets && (
                            <ul className="mt-6 space-y-1.5 border-t border-white/[0.06] pt-5 text-xs text-faint">
                                {info.datasets.map((d) => <li key={d}>{d}</li>)}
                            </ul>
                        )}
                    </aside>
                </div>
            </div>
        </section>
    );
}
