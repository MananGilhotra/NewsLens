/**
 * Fact-check result: animated gauge + verdict, reasoning and one card per signal.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Cpu, Bot, Building2, BadgeCheck, ArrowUpRight, RotateCcw, Copy, Check, Quote, FileText, Globe } from 'lucide-react';
import ScoreGauge from '../ui/ScoreGauge';
import SplitReveal from '../ui/SplitReveal';
import { toneForVerdict, toneForScore, VERDICT_COPY, timeAgo } from '../../lib/verdict';
import { useToast } from '../ui/Toast';

const ease = [0.16, 1, 0.3, 1];
const ENGINE_LABEL = { model: 'NewsLens model', llm: 'AI fact-check', source: 'Source rating', factChecks: 'Published fact-checks' };
const CLAIM_STYLE = {
    supported: 'border-real/30 text-real',
    disputed: 'border-unsure/30 text-unsure',
    false: 'border-fake/30 text-fake',
    unverifiable: 'border-white/15 text-muted'
};

function AmbientFlash({ tone }) {
    return createPortal(
        <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[5]"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${tone.hex}33, transparent 65%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.25] }}
            transition={{ duration: 2.4, times: [0, 0.25, 1], ease: 'easeOut' }}
        />,
        document.body
    );
}

function SignalCard({ icon: Icon, title, score, weight, children, index, muted }) {
    const tone = score == null ? null : toneForScore(score);
    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 + index * 0.1, ease }}
            className={`card p-6 ${muted ? 'opacity-70' : ''}`}
        >
            <header className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2.5 text-sm font-medium text-paper">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.03]"><Icon className="h-4 w-4 text-lens" strokeWidth={1.75} /></span>
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    {weight != null && <span className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">weight {weight.toFixed(2)}</span>}
                    {tone && <span className={`font-display text-2xl ${tone.text}`}>{score}</span>}
                </div>
            </header>
            {score != null && (
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div className={`h-full origin-left rounded-full ${tone.bg}`} initial={{ scaleX: 0 }} animate={{ scaleX: score / 100 }} transition={{ duration: 1.3, delay: 0.7 + index * 0.1, ease }} />
                </div>
            )}
            <div className="mt-4 text-sm leading-relaxed text-muted">{children}</div>
        </motion.section>
    );
}

function CueList({ cues, kind }) {
    if (!cues?.length) return null;
    const style = kind === 'fake' ? 'border-fake/25 bg-fake/[0.08] text-fake' : 'border-real/25 bg-real/[0.08] text-real';
    return (
        <div className="mt-3">
            <div className="mb-2 font-mono text-[0.62rem] uppercase tracking-wider text-faint">{kind === 'fake' ? 'Pushed towards fake' : 'Pushed towards credible'}</div>
            <div className="flex flex-wrap gap-1.5">
                {cues.map((cue, i) => (
                    <motion.span key={cue.term} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.05, type: 'spring', stiffness: 400, damping: 24 }}
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${style}`}>
                        {cue.term}
                    </motion.span>
                ))}
            </div>
        </div>
    );
}

export default function ResultView({ result, services, onReset }) {
    const [copied, setCopied] = useState(false);
    const toast = useToast();
    const tone = toneForVerdict(result.verdict);
    const copy = VERDICT_COPY[result.verdict] || VERDICT_COPY.Inconclusive;
    const { model, llm, source, factChecks = [], factCheckSearch } = result.signals || {};
    const article = result.article;

    useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(false), 1800);
        return () => clearTimeout(timer);
    }, [copied]);

    const copyResult = () => {
        const text = `NewsLens verdict: ${copy.title} (${result.score}/100, ${result.confidence} confidence)\n${result.reasoning}${article?.url ? `\n${article.url}` : ''}`;
        navigator.clipboard?.writeText(text).then(() => { setCopied(true); toast('Result copied to clipboard', { tone: 'success' }); });
    };

    return (
        <div className="space-y-5">
            <AmbientFlash tone={tone} />

            <motion.section
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease }}
                className={`card overflow-hidden p-6 md:p-10 ${tone.glow}`}
            >
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-[90px]" style={{ background: tone.hex }} />
                <div className="relative grid grid-cols-1 gap-8 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
                    <div className="mx-auto"><ScoreGauge score={result.score} size={230} tone={tone} /></div>
                    <div>
                        <p className="eyebrow flex items-center gap-2"><tone.Icon className={`h-3.5 w-3.5 ${tone.text}`} /> Verdict · {result.confidence} confidence</p>
                        <SplitReveal as="h2" trigger="load" delay={0.3} className={`mt-3 font-display text-display-md font-light ${tone.text}`}>
                            {copy.title}
                        </SplitReveal>
                        <p className="mt-3 max-w-xl text-muted">{copy.sub}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {(result.engine || []).map((key) => <span key={key} className="chip">{ENGINE_LABEL[key] || key}</span>)}
                        </div>
                    </div>
                </div>

                {article && (
                    <div className="relative mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-ink/40 p-4 sm:flex-row sm:items-center">
                        <FileText className="h-5 w-5 shrink-0 text-faint" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-paper">{article.title}</div>
                            <div className="truncate font-mono text-[0.68rem] text-faint">
                                {[article.siteName || article.domain, article.byline, article.publishedAt && timeAgo(article.publishedAt), article.words && `${article.words.toLocaleString()} words`].filter(Boolean).join(' · ')}
                            </div>
                        </div>
                        <a href={article.url} target="_blank" rel="noreferrer" className="btn-ghost shrink-0 px-4 py-2 text-xs">Original <ArrowUpRight className="h-3.5 w-3.5" /></a>
                    </div>
                )}

                <blockquote className="relative mt-8 border-l-2 border-white/10 pl-5 text-[1.02rem] leading-relaxed text-paper-dim">
                    <Quote className="absolute -left-2.5 -top-2 h-4 w-4 rotate-180 text-faint" />
                    {result.reasoning}
                </blockquote>
            </motion.section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SignalCard icon={Cpu} title="NewsLens model" score={model?.score} weight={model?.weight} index={0}>
                    {model ? (
                        <>
                            Writing style puts this at <span className="text-paper">{Math.round(model.probFake * 100)}%</span> fake-probability
                            {model.tokens < 12 && ' - a short input, so this signal carries less weight'}.
                            <CueList cues={model.cues?.fake} kind="fake" />
                            <CueList cues={model.cues?.real} kind="real" />
                        </>
                    ) : 'Model unavailable - run ml/train_fake_news.py to train it.'}
                </SignalCard>

                <SignalCard icon={Bot} title="AI fact-check" score={llm?.score} weight={llm?.weight} index={1} muted={!llm}>
                    {llm ? (
                        <>
                            {llm.claims?.length > 0 && (
                                <ul className="space-y-2">
                                    {llm.claims.map((claim) => (
                                        <li key={claim.claim} className="flex items-start gap-2.5">
                                            <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-px font-mono text-[0.6rem] uppercase ${CLAIM_STYLE[claim.assessment]}`}>{claim.assessment}</span>
                                            <span className="text-paper-dim">{claim.claim}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {llm.redFlags?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {llm.redFlags.map((flag) => <span key={flag} className="rounded-full border border-fake/25 bg-fake/[0.08] px-2.5 py-0.5 text-xs text-fake">{flag}</span>)}
                                </div>
                            )}
                            {llm.sources?.length > 0 && (
                                <div className="mt-4 border-t border-white/[0.06] pt-3">
                                    <p className="mb-2 flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-wider text-lens"><Globe className="h-3 w-3" /> Sources checked live</p>
                                    <ul className="space-y-1.5">
                                        {llm.sources.map((source) => {
                                            let host = '';
                                            try { host = new URL(source.url).hostname.replace(/^www\./, ''); } catch { /* keep empty */ }
                                            return (
                                                <li key={source.url}>
                                                    <a href={source.url} target="_blank" rel="noreferrer" className="group flex items-baseline gap-2 text-paper-dim hover:text-paper">
                                                        <span className="shrink-0 font-mono text-[0.62rem] text-faint">{host}</span>
                                                        <span className="min-w-0 truncate group-hover:underline">{source.title}</span>
                                                        <ArrowUpRight className="h-3 w-3 shrink-0 text-faint" />
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                            <div className="mt-3 font-mono text-[0.62rem] text-faint">
                                {llm.model}{llm.provider ? ` · via ${{ groq: 'Groq', openrouter: 'OpenRouter' }[llm.provider] || llm.provider}` : ''}{llm.grounded ? ' · live web search' : ''}
                            </div>
                        </>
                    ) : services?.llm?.enabled
                        ? 'The AI fact-check could not run for this request (rate limit or timeout). The verdict uses the other signals.'
                        : 'AI fact-checking isn’t enabled on this server, so the verdict uses the other signals.'}
                </SignalCard>

                <SignalCard icon={Building2} title="Source reputation" score={source?.score} index={2} muted={!source}>
                    {source ? (
                        <><span className="text-paper">{source.name}</span> - {source.label.toLowerCase()}{source.domain && source.domain !== source.name ? ` (${source.domain})` : ''}.</>
                    ) : article ? `${article.domain} is not in the index of 5,300+ rated outlets - judge it by the other signals.` : 'Pasted text has no source to rate. Use a link to include the outlet’s reputation.'}
                </SignalCard>

                <SignalCard icon={BadgeCheck} title="Published fact-checks" index={3} muted={!factChecks.length}>
                    {factChecks.length ? (
                        <ul className="space-y-3">
                            {factChecks.map((fc) => (
                                <li key={fc.url}>
                                    <a href={fc.url} target="_blank" rel="noreferrer" className="group block">
                                        <span className={`flex items-center gap-1.5 font-mono text-[0.65rem] uppercase ${fc.score == null ? 'text-lens' : toneForScore(fc.score).text}`}>
                                            {fc.publisher}{fc.rating ? ` · ${fc.rating}` : ''}
                                            <ArrowUpRight className="h-3 w-3 opacity-60" />
                                        </span>
                                        <span className="mt-0.5 block text-paper-dim group-hover:text-paper group-hover:underline">{fc.claim}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (factCheckSearch || services?.factCheck)
                        ? 'No published fact-checks were found for this claim. That isn’t evidence either way - many stories are never formally fact-checked.'
                        : 'Fact-check search isn’t available right now, so this verdict uses the other signals.'}
                </SignalCard>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap justify-center gap-3 pt-4">
                <button type="button" onClick={onReset} className="btn-primary"><RotateCcw className="h-4 w-4" /> Check something else</button>
                <button type="button" onClick={copyResult} className="btn-ghost">{copied ? <><Check className="h-4 w-4 text-real" /> Copied</> : <><Copy className="h-4 w-4" /> Copy result</>}</button>
            </motion.div>
        </div>
    );
}
