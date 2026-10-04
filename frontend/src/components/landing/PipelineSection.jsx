/**
 * "How it works" - pinned, scroll-scrubbed walkthrough of the four signals on one specimen article.
 * Desktop with motion: pinned timeline. Mobile / reduced motion: everything shown in its final state.
 */

import { useRef } from 'react';
import { ScanText, Cpu, Globe2, Gavel } from 'lucide-react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import SectionLabel from '../ui/SectionLabel';

const STEPS = [
    { icon: ScanText, title: 'Read', text: 'Paste text or a link. NewsLens fetches the full article, strips the page chrome and normalises the language.' },
    { icon: Cpu, title: 'Model', text: 'Our own classifier - trained on 170k+ labelled articles and headlines from 700+ outlets - scores the writing and shows which phrases drove it.' },
    { icon: Globe2, title: 'Cross-check', text: 'An AI fact-checker tests the concrete claims, the outlet is looked up among 5,300+ rated sources and published fact-checks are matched.' },
    { icon: Gavel, title: 'Verdict', text: 'Every signal is weighted by how reliable it is for this input and merged into one score you can actually explain.' }
];

const SPECIMEN = [
    ['SHOCKING:', 'cue'], ['Scientists', ''], ['confirm', ''], ['miracle', 'cue'], ['cure', ''], ['they', 'cue'], ['don’t', 'cue'],
    ['want', 'cue'], ['you', 'cue'], ['to', ''], ['know', 'cue'], ['about', ''], ['!!!', 'cue']
];
const BODY = 'An anonymous insider has leaked documents showing a common fruit cures every known disease. Share this before it gets deleted - the mainstream media will never report it.';

const GAUGE_R = 52;
const GAUGE_C = 2 * Math.PI * GAUGE_R;
const FINAL_SCORE = 7;

export default function PipelineSection() {
    const root = useRef(null);

    useGSAP(() => {
        const q = gsap.utils.selector(root);
        const mm = gsap.matchMedia();
        mm.add(`${MEDIA.desktop} and ${MEDIA.motion}`, () => {
            const steps = q('[data-step]');
            const setActive = (index) => steps.forEach((step, i) => { step.dataset.active = String(i === index); });
            setActive(0);
            const score = { v: 100 };
            const number = q('[data-gauge-number]')[0];

            const tl = gsap.timeline({
                defaults: { ease: 'power2.out', duration: 1 },
                scrollTrigger: {
                    trigger: root.current,
                    start: 'top top',
                    end: '+=2800',
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1,
                    onUpdate: (self) => setActive(Math.min(3, Math.floor(self.progress * 4.2)))
                }
            });

            tl.from(q('[data-specimen]'), { y: 60, opacity: 0, duration: 1.2 })
                // 1. Read: scan line passes, tokens light up
                .fromTo(q('[data-scanline]'), { yPercent: -10, opacity: 0 }, { yPercent: 1100, opacity: 1, duration: 2.2, ease: 'none' })
                .from(q('[data-token]'), { backgroundColor: 'rgba(103,232,249,0)', stagger: 0.04, duration: 0.3 }, '<0.2')
                .to(q('[data-scanline]'), { opacity: 0, duration: 0.3 })
                .from(q('[data-token-count]'), { opacity: 0, y: 10 }, '<')
                // 2. Model: manipulative cues turn red, weights pop in
                .to(q('[data-token="cue"]'), { color: '#FB7185', backgroundColor: 'rgba(251,113,133,0.14)', stagger: 0.08, duration: 0.5 })
                .from(q('[data-weight]'), { scale: 0, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(2)' }, '<')
                .from(q('[data-model-bar]'), { scaleX: 0, transformOrigin: 'left center', duration: 1 }, '<0.3')
                // 3. Cross-check rows
                .from(q('[data-check]'), { x: 40, opacity: 0, stagger: 0.45, duration: 0.9 })
                // 4. Verdict: gauge drains to the final score, stamp lands
                .fromTo(q('[data-gauge-ring]'), { strokeDashoffset: 0 }, { strokeDashoffset: GAUGE_C * (1 - FINAL_SCORE / 100), duration: 1.6, ease: 'power3.inOut' })
                .fromTo(score, { v: 100 }, { v: FINAL_SCORE, duration: 1.6, ease: 'power3.inOut', onUpdate: () => { number.textContent = Math.round(score.v); } }, '<')
                .from(q('[data-stamp]'), { scale: 2.2, rotate: -25, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' }, '-=0.4')
                .to({}, { duration: 0.8 });

            return () => setActive(-1);
        });
        return () => mm.revert();
    }, { scope: root });

    return (
        <section id="how-it-works" ref={root} className="relative overflow-hidden border-t border-white/[0.06] bg-ink py-24 lg:flex lg:h-screen lg:items-center lg:py-0">
            <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/3 h-[32rem] w-[32rem] rounded-full bg-fake/[0.06] blur-[140px]" />
            <div className="relative mx-auto grid grid-cols-1 w-full max-w-[90rem] gap-14 px-6 md:px-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
                <div>
                    <SectionLabel index={2} className="mb-8">How the lens works</SectionLabel>
                    <h2 className="font-display text-display-md font-light text-paper">
                        Four signals. <em className="text-lens">One verdict.</em>
                    </h2>
                    <ol className="mt-12 space-y-2">
                        {STEPS.map(({ icon: Icon, title, text }, i) => (
                            <li
                                key={title}
                                data-step
                                data-active="true"
                                className="group relative rounded-2xl border border-transparent p-4 pl-5 transition-all duration-500 data-[active=false]:opacity-35 data-[active=true]:border-white/[0.08] data-[active=true]:bg-white/[0.025]"
                            >
                                <span className="absolute left-0 top-4 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-lens to-transparent opacity-0 transition-opacity duration-500 group-data-[active=true]:opacity-100" />
                                <div className="flex items-start gap-4">
                                    <span className="mt-0.5 font-mono text-xs text-faint">0{i + 1}</span>
                                    <div>
                                        <h3 className="flex items-center gap-2 text-lg font-medium text-paper">
                                            <Icon className="h-4 w-4 text-lens" strokeWidth={1.75} /> {title}
                                        </h3>
                                        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{text}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Specimen */}
                <div data-specimen className="card relative overflow-hidden p-6 md:p-8">
                    <div data-scanline aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-lens/25 to-transparent opacity-0" />
                    <div className="flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-wider text-faint">
                        <span>dailytruth-news.co · 2h ago</span>
                        <span data-token-count>46 tokens · 45 bigrams</span>
                    </div>
                    <h3 className="mt-5 font-display text-[1.65rem] leading-[1.6] text-paper md:text-3xl">
                        {SPECIMEN.map(([word, kind], i) => (
                            <span key={i} className="relative inline-block">
                                <span data-token={kind || 'word'} className="rounded px-[3px] py-px" style={{ backgroundColor: 'rgba(103,232,249,0.08)' }}>{word}</span>
                                {kind === 'cue' && i % 3 === 0 && (
                                    <span data-weight className="absolute -top-2.5 right-1 rounded bg-fake px-1 font-mono text-[0.5rem] leading-[1.35] text-ink">+{(0.4 + (i % 5) * 0.13).toFixed(2)}</span>
                                )}{' '}
                            </span>
                        ))}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted">{BODY}</p>

                    <div className="mt-6 flex items-center gap-3 text-xs">
                        <span className="w-28 shrink-0 font-mono uppercase tracking-wider text-faint">Model</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div data-model-bar className="h-full w-[9%] rounded-full bg-fake" />
                        </div>
                        <span className="w-8 text-right font-mono text-fake">9</span>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
                        <ul className="space-y-2.5 text-sm">
                            <li data-check className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink/40 p-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fake" />
                                <span className="text-muted"><span className="text-paper">AI fact-check:</span> claims contradict medical consensus, no verifiable source</span>
                            </li>
                            <li data-check className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink/40 p-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-unsure" />
                                <span className="text-muted"><span className="text-paper">Source:</span> not among 5,300+ rated outlets</span>
                            </li>
                            <li data-check className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink/40 p-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fake" />
                                <span className="text-muted"><span className="text-paper">Fact-checks:</span> similar claim rated “False”</span>
                            </li>
                        </ul>
                        <div className="relative mx-auto grid h-36 w-36 place-items-center">
                            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                                <circle cx="60" cy="60" r={GAUGE_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                                <circle data-gauge-ring cx="60" cy="60" r={GAUGE_R} fill="none" stroke="#FB7185" strokeWidth="7" strokeLinecap="round"
                                    strokeDasharray={GAUGE_C} strokeDashoffset={GAUGE_C * (1 - FINAL_SCORE / 100)} />
                            </svg>
                            <div className="text-center">
                                <div data-gauge-number className="font-display text-4xl font-light text-fake">{FINAL_SCORE}</div>
                                <div className="font-mono text-[0.6rem] uppercase tracking-widest text-faint">/ 100</div>
                            </div>
                            <div data-stamp className="absolute -bottom-3 -right-6 rotate-[-8deg] rounded-md border-2 border-fake px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-fake">
                                Likely fake
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
