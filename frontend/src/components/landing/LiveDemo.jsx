/**
 * Try-it-now: runs the real analyzer from the landing page, no account needed.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, ScanSearch, Sparkles, AlertTriangle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { toneForVerdict, VERDICT_COPY } from '../../lib/verdict';
import SectionLabel from '../ui/SectionLabel';
import SplitReveal from '../ui/SplitReveal';
import ScoreGauge from '../ui/ScoreGauge';
import MagneticButton from '../ui/MagneticButton';

const ease = [0.16, 1, 0.3, 1];
const PRESETS = [
    { label: 'A viral claim', text: 'BREAKING: Scientists confirm that drinking hot water with lemon cures cancer within three days. Doctors don’t want you to know this simple trick - share this before it gets deleted!!!' },
    { label: 'A wire report', text: 'The European Central Bank kept its key interest rates unchanged on Thursday, saying inflation in the euro area had continued to ease. In a statement released after its policy meeting in Frankfurt, the bank said it would keep borrowing costs at current levels for as long as necessary.' },
    { label: 'A forwarded message', text: 'URGENT!! Forward to everyone you know. The government will switch off all mobile networks tonight from midnight for a secret test. Anonymous insiders say they don’t want the public to find out!!!' }
];

export default function LiveDemo() {
    const [text, setText] = useState('');
    const [state, setState] = useState('idle');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const analyze = async (input = text) => {
        if (input.trim().length < 10) return;
        setState('loading');
        setError('');
        setResult(null);
        const started = Date.now();
        try {
            const response = await api.post('/analyze', { text: input.trim() });
            await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - started))));
            setResult(response.data.data);
            setState('done');
        } catch (err) {
            setError(errorMessage(err, 'The analysis could not run right now.'));
            setState('idle');
        }
    };

    const tone = result ? toneForVerdict(result.verdict) : null;
    const cues = result?.signals?.model?.cues;
    const shownCues = cues ? [...cues.fake.slice(0, 3).map((c) => ({ ...c, kind: 'fake' })), ...cues.real.slice(0, 3).map((c) => ({ ...c, kind: 'real' }))] : [];

    return (
        <section id="demo" className="relative overflow-hidden border-t border-white/[0.06] bg-ink py-28 md:py-36">
            <div aria-hidden="true" className="pointer-events-none absolute -left-32 bottom-0 h-[34rem] w-[34rem] rounded-full bg-lens-deep/[0.06] blur-[150px]" />
            <div className="relative mx-auto max-w-[90rem] px-6 md:px-12">
                <SectionLabel index={3} aside="No account needed">Try it now</SectionLabel>
                <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                    <div>
                        <SplitReveal className="font-display text-display-md font-light text-paper">
                            Don’t take our <em className="text-lens">word</em> for it.
                        </SplitReveal>
                        <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted">
                            Paste anything - a headline, a forwarded message, a paragraph from an article - and watch the
                            NewsLens model read it. Or start with one of these:
                        </p>
                        <div className="mt-8 space-y-2.5">
                            {PRESETS.map((preset, i) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => { setText(preset.text); analyze(preset.text); }}
                                    className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.015] px-5 py-4 text-left transition-[border-color,background-color] duration-300 hover:border-white/15 hover:bg-white/[0.03]"
                                >
                                    <span className="font-mono text-xs text-faint">0{i + 1}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm text-paper">{preset.label}</span>
                                        <span className="block truncate font-display text-sm italic text-faint">{preset.text}</span>
                                    </span>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-faint transition-transform duration-300 group-hover:translate-x-1 group-hover:text-lens" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card edge-lit overflow-hidden">
                        <form onSubmit={(e) => { e.preventDefault(); analyze(); }} className="p-5 md:p-7">
                            <div className="flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint">
                                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-real" /> Live analyzer</span>
                                <span>{text.length.toLocaleString()} chars</span>
                            </div>
                            <label htmlFor="demo-text" className="sr-only">Text to analyse</label>
                            <textarea
                                id="demo-text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={5}
                                maxLength={20000}
                                data-lenis-prevent
                                placeholder="Paste a headline or a paragraph…"
                                className="mt-4 w-full resize-none bg-transparent font-display text-xl leading-relaxed text-paper outline-none placeholder:text-faint md:text-2xl"
                            />
                            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
                                <span className="text-xs text-faint">Runs the real model · nothing to install</span>
                                <button type="submit" disabled={text.trim().length < 10 || state === 'loading'} className="btn-primary">
                                    {state === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading…</> : <><ScanSearch className="h-4 w-4" /> Analyse</>}
                                </button>
                            </div>
                        </form>

                        <AnimatePresence mode="wait" initial={false}>
                            {state === 'loading' && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="relative h-1 overflow-hidden bg-white/[0.04]">
                                    <motion.div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-lens to-transparent"
                                        animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} />
                                </motion.div>
                            )}
                            {state === 'done' && result && (
                                <motion.div key={result.analyzedAt} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.6, ease }} className="overflow-hidden border-t border-white/[0.06] bg-ink/50">
                                    <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center md:p-7">
                                        <div className="mx-auto"><ScoreGauge score={result.score} size={150} stroke={8} tone={tone} compact /></div>
                                        <div>
                                            <p className="eyebrow">{result.confidence} confidence</p>
                                            <p className={`mt-1 font-display text-3xl font-light ${tone.text}`}>{(VERDICT_COPY[result.verdict] || VERDICT_COPY.Inconclusive).title}</p>
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {shownCues.map((cue, i) => (
                                                    <motion.span key={`${cue.kind}-${cue.term}`} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.4 + i * 0.06, type: 'spring', stiffness: 400, damping: 24 }}
                                                        className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${cue.kind === 'fake' ? 'border-fake/25 bg-fake/[0.08] text-fake' : 'border-real/25 bg-real/[0.08] text-real'}`}>
                                                        {cue.kind === 'fake' ? '+' : '−'} {cue.term}
                                                    </motion.span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4 md:px-7">
                                        <p className="flex items-center gap-2 text-xs text-faint"><Sparkles className="h-3.5 w-3.5 text-lens" /> Full reports add AI claim checks, source ratings and links.</p>
                                        <MagneticButton as="link" to="/signup" className="btn-ghost px-4 py-2 text-xs">Get the full report <ArrowRight className="h-3.5 w-3.5" /></MagneticButton>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {error && (
                            <div className="flex items-start gap-3 border-t border-fake/20 bg-fake/[0.06] px-5 py-4 text-sm text-fake md:px-7" role="alert">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
