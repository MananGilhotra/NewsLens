/**
 * Hero: a wall of headlines rendered twice - a blurred "noise" layer and a sharp layer that is
 * only visible through the lens. The lens follows the cursor (or drifts on touch / when idle)
 * and reads out the verdict of the headline under its centre.
 * A newspaper masthead runs along the top and a live wire of real headlines along the bottom.
 */

import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Check, X, Minus } from 'lucide-react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import { headlineRows } from './headlines';
import SplitReveal from '../ui/SplitReveal';
import MagneticButton from '../ui/MagneticButton';
import LiveTicker from './LiveTicker';
import useModelInfo, { trainingSamples } from '../../hooks/useModelInfo';
import useLiveHeadlines from '../../hooks/useLiveHeadlines';

const VERDICT_STYLE = {
    real: { badge: 'border-real/40 bg-real/10 text-real', Icon: Check, label: 'Real' },
    fake: { badge: 'border-fake/40 bg-fake/10 text-fake', Icon: X, label: 'Fake' },
    unsure: { badge: 'border-unsure/40 bg-unsure/10 text-unsure', Icon: Minus, label: 'Unsure' }
};

function dayOfYear(date = new Date()) {
    return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
}

function HeadlineWall({ rows, clear }) {
    return (
        <div className={`absolute inset-0 flex flex-col justify-center gap-5 md:gap-7 ${clear ? 'lens-reveal' : ''}`} aria-hidden="true">
            {rows.map((row, r) => (
                <div
                    key={r}
                    className={`flex w-max gap-10 will-change-transform ${r % 2 ? 'animate-marquee-reverse' : 'animate-marquee'} ${clear ? '' : 'opacity-[0.3] blur-[2.5px] grayscale'}`}
                    style={{ '--marquee-duration': `${90 + (r % 3) * 25}s` }}
                >
                    {[...row, ...row].map((h, i) => {
                        const style = VERDICT_STYLE[h.verdict];
                        return (
                            <div key={`${h.id}-${i}`} data-verdict={clear ? h.verdict : undefined} data-score={clear ? h.score : undefined}
                                className="flex shrink-0 items-center gap-3 whitespace-nowrap">
                                {clear && (
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider ${style.badge}`}>
                                        <style.Icon className="h-3 w-3" strokeWidth={2.5} />
                                        {style.label} {h.score}
                                    </span>
                                )}
                                <span className={`font-display text-2xl font-light md:text-[2.15rem] ${clear && h.verdict === 'fake' ? 'text-paper/90 line-through decoration-fake/70 decoration-2' : 'text-paper'}`}>
                                    {h.text}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export default function LensHero({ ready = true }) {
    const root = useRef(null);
    const ring = useRef(null);
    const readout = useRef(null);
    const coords = useRef(null);
    const intro = useRef(null);
    const rows = useMemo(() => headlineRows(7, 6), []);
    const samples = trainingSamples(useModelInfo());
    const { articles, outlets, trustIndex } = useLiveHeadlines();
    const today = new Date();

    // Pause the marquees when the hero is off screen
    useEffect(() => {
        const el = root.current;
        const observer = new IntersectionObserver(([entry]) => {
            el.querySelectorAll('.animate-marquee, .animate-marquee-reverse').forEach((row) => {
                row.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
            });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (ready) intro.current?.play();
    }, [ready]);

    useGSAP((context, contextSafe) => {
        const el = root.current;
        const mm = gsap.matchMedia();

        mm.add({ motion: MEDIA.motion, reduce: MEDIA.reduce, desktop: MEDIA.desktop }, (ctx) => {
            const { reduce, desktop } = ctx.conditions;
            const radius = desktop ? 165 : 108;
            const home = { x: desktop ? 0.68 : 0.5, y: desktop ? 0.44 : 0.3 };
            const bounds = () => el.getBoundingClientRect();
            const pos = { x: bounds().width * home.x, y: bounds().height * home.y };

            const apply = () => {
                el.style.setProperty('--lens-x', `${pos.x}px`);
                el.style.setProperty('--lens-y', `${pos.y}px`);
                gsap.set(ring.current, { x: pos.x, y: pos.y });
                if (coords.current) {
                    const rect = bounds();
                    coords.current.textContent = `x ${(pos.x / rect.width).toFixed(2)} · y ${(pos.y / rect.height).toFixed(2)}`;
                }
            };
            apply();

            if (reduce) {
                el.style.setProperty('--lens-r', `${radius}px`);
                return undefined;
            }

            // Intro: the wall resolves, the aperture opens, the copy rises (paused until the preloader is done)
            intro.current = gsap.timeline({ paused: !ready, defaults: { ease: 'expo.out' } })
                .from(el.querySelectorAll('[data-wall]'), { opacity: 0, scale: 1.08, duration: 2.4 }, 0)
                .fromTo(el, { '--lens-r': '0px' }, { '--lens-r': `${radius}px`, duration: 1.8 }, 0.4)
                .from(ring.current.firstElementChild, { scale: 0.3, opacity: 0, rotate: -120, duration: 1.8 }, 0.4)
                .from(el.querySelectorAll('[data-hero-fade]'), { y: 28, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.8)
                .from(el.querySelectorAll('[data-hero-rule]'), { scaleX: 0, duration: 1.6, stagger: 0.1, ease: 'expo.inOut' }, 0.2);

            const xTo = gsap.quickTo(pos, 'x', { duration: 0.9, ease: 'power3.out', onUpdate: apply });
            const yTo = gsap.quickTo(pos, 'y', { duration: 0.9, ease: 'power3.out', onUpdate: apply });

            let idle = true;
            let idleTimer;
            const onMove = contextSafe((event) => {
                if (event.pointerType !== 'mouse') return;
                const rect = bounds();
                idle = false;
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => { idle = true; }, 2600);
                xTo(event.clientX - rect.left);
                yTo(event.clientY - rect.top);
            });
            el.addEventListener('pointermove', onMove);

            // Autonomous drift on touch screens and while the cursor rests
            const start = performance.now();
            const drift = () => {
                if (!idle) return;
                const t = (performance.now() - start) / 1000;
                const rect = bounds();
                xTo(rect.width * home.x + Math.sin(t * 0.32) * rect.width * (desktop ? 0.18 : 0.26));
                yTo(rect.height * home.y + Math.sin(t * 0.47 + 1.2) * rect.height * (desktop ? 0.15 : 0.07));
            };
            gsap.ticker.add(drift);

            // Readout: verdict of the headline under the lens centre
            let last = null;
            const read = setInterval(() => {
                const rect = bounds();
                if (rect.bottom < 0 || !readout.current) return;
                const hit = document.elementsFromPoint(rect.left + pos.x, rect.top + pos.y).find((node) => node.dataset?.verdict);
                const key = hit ? `${hit.dataset.verdict}-${hit.dataset.score}` : null;
                if (key === last) return;
                last = key;
                const label = hit ? `${VERDICT_STYLE[hit.dataset.verdict].label} · ${hit.dataset.score}` : 'Scanning';
                readout.current.dataset.tone = hit ? hit.dataset.verdict : 'idle';
                gsap.to(readout.current.querySelector('[data-text]'), { duration: 0.6, scrambleText: { text: label, chars: '01#%NEWSLENS', speed: 0.6 } });
            }, 140);

            return () => {
                el.removeEventListener('pointermove', onMove);
                gsap.ticker.remove(drift);
                clearInterval(read);
                clearTimeout(idleTimer);
            };
        });
        return () => mm.revert();
    }, { scope: root });

    const edition = `Vol. II · No. ${dayOfYear(today)}`;
    const dateline = today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <section ref={root} data-cursor-hide className="relative flex h-[100svh] min-h-[720px] flex-col overflow-hidden bg-ink" style={{ '--lens-r': '0px' }}>
            {/* Atmosphere */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-1/4 h-[36rem] w-[36rem] rounded-full bg-violet-deep/20 blur-[140px]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-0 h-[30rem] w-[30rem] rounded-full bg-lens-deep/10 blur-[140px]" />

            <div data-wall className="absolute inset-0"><HeadlineWall rows={rows} clear={false} /></div>
            <div data-wall className="absolute inset-0"><HeadlineWall rows={rows} clear /></div>

            {/* Lens ring + readouts, positioned by GSAP at the lens centre */}
            <div ref={ring} className="pointer-events-none absolute left-0 top-0 z-10" aria-hidden="true">
                <div className="relative -translate-x-1/2 -translate-y-1/2" style={{ width: 'calc(var(--lens-r) * 2 + 28px)', height: 'calc(var(--lens-r) * 2 + 28px)' }}>
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-spin-slow">
                        <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(103,232,249,0.55)" strokeWidth="0.35" />
                        {Array.from({ length: 60 }, (_, i) => {
                            const a = (i / 60) * Math.PI * 2;
                            const inner = i % 5 === 0 ? 45 : 46.6;
                            return <line key={i} x1={50 + Math.cos(a) * inner} y1={50 + Math.sin(a) * inner} x2={50 + Math.cos(a) * 48} y2={50 + Math.sin(a) * 48} stroke="rgba(103,232,249,0.45)" strokeWidth="0.3" />;
                        })}
                    </svg>
                    <div className="absolute inset-[14px] rounded-full shadow-[inset_0_0_60px_rgba(103,232,249,0.12),0_0_80px_-20px_rgba(103,232,249,0.35)]" />
                    <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-lens/70" />
                    <div className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-lens/70" />
                    <span ref={coords} className="absolute -top-1 left-[78%] hidden whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.18em] text-lens/60 lg:block">x 0.68 · y 0.44</span>
                    <span className="absolute bottom-[12%] right-[-8%] hidden font-mono text-[0.58rem] uppercase tracking-[0.18em] text-lens/40 lg:block">f/1.4</span>
                    <div
                        ref={readout}
                        data-tone="idle"
                        className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-ink/80 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted backdrop-blur data-[tone=fake]:border-fake/40 data-[tone=fake]:text-fake data-[tone=real]:border-real/40 data-[tone=real]:text-real data-[tone=unsure]:border-unsure/40 data-[tone=unsure]:text-unsure"
                    >
                        <span data-text>Scanning</span>
                    </div>
                </div>
            </div>

            {/* Legibility scrims behind the copy */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_10%_95%,rgba(7,8,11,0.97)_10%,rgba(7,8,11,0.78)_42%,transparent_72%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-gradient-to-t from-ink via-ink/80 to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-ink to-transparent" />

            {/* Masthead */}
            <div className="relative z-20 mx-auto mt-20 w-full max-w-[90rem] px-6 md:mt-24 md:px-12">
                <div data-hero-rule className="h-px origin-left bg-white/15" />
                <div data-hero-fade className="flex items-center justify-between gap-6 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint">
                    <span>{edition}</span>
                    <span className="hidden md:inline">{dateline}</span>
                    <span className="flex items-center gap-2">
                        <span className="hidden sm:inline">Trust index</span>
                        <span className="text-paper">{trustIndex ?? '—'}</span>
                        {outlets > 0 && <span className="hidden text-faint lg:inline">· {articles.length} stories · {outlets} outlets</span>}
                    </span>
                </div>
                <div data-hero-rule className="h-px origin-left bg-white/15" />
                <div data-hero-rule className="mt-[3px] h-px origin-left bg-white/[0.07]" />
            </div>

            <div className="relative z-20 mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-end px-6 pb-10 md:px-12 md:pb-14">
                <p data-hero-fade className="eyebrow mb-6 flex items-center gap-3">
                    <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-real" />
                    Credibility engine · trained on {samples ? `${(Math.floor(samples / 1000) * 1000).toLocaleString()}+` : '170,000+'} articles &amp; headlines
                </p>
                <SplitReveal as="h1" trigger="load" type="chars" active={ready} delay={0.45} stagger={0.022} className="max-w-5xl font-display text-display-xl font-light text-paper">
                    See through <br className="hidden sm:block" />
                    the <em className="text-lens">noise.</em>
                </SplitReveal>
                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
                    <p data-hero-fade className="max-w-xl text-pretty text-lg leading-relaxed text-muted">
                        NewsLens scores how far you can trust any headline, article or image - using its own trained model,
                        an AI fact-check and a rating of 5,300+ news sources. <span className="hidden text-paper/80 lg:inline">Move across the wall to look through the lens.</span>
                    </p>
                    <div data-hero-fade className="flex flex-wrap items-center gap-3">
                        <MagneticButton as="link" to="/signup" className="btn-primary px-7 py-3.5 text-[0.95rem]">
                            Start verifying <ArrowRight className="h-4 w-4" />
                        </MagneticButton>
                        <a href="#demo" className="btn-ghost px-6 py-3.5">Try it now</a>
                    </div>
                </div>
            </div>

            {/* Scroll cue */}
            <div data-hero-fade aria-hidden="true" className="absolute bottom-24 right-6 z-20 hidden flex-col items-center gap-3 md:flex md:right-12">
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.3em] text-faint [writing-mode:vertical-rl]">Scroll</span>
                <span className="relative h-14 w-px overflow-hidden bg-white/10">
                    <span className="absolute inset-x-0 top-0 h-5 animate-[scroll-cue_2.2s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-lens" />
                </span>
            </div>

            <div data-hero-fade className="relative z-20">
                <LiveTicker articles={articles} />
            </div>
        </section>
    );
}
