/**
 * First-visit intro: the lens calibrates (counter 000 -> 100), then the aperture opens onto the page.
 * Shown once per browser session; skipped for reduced motion.
 */

import { useEffect, useRef } from 'react';
import { useLenis } from 'lenis/react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import { LogoMark } from '../brand/Logo';

const KEY = 'newslens:intro-seen';

export function shouldShowPreloader() {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia(MEDIA.reduce).matches) return false;
    try {
        return sessionStorage.getItem(KEY) !== '1';
    } catch {
        return false;
    }
}

const RINGS = [
    { r: 46, ticks: 72, long: 6, opacity: 0.55 },
    { r: 38, ticks: 36, long: 3, opacity: 0.35 },
    { r: 30, ticks: 12, long: 1, opacity: 0.6 }
];

export default function Preloader({ onDone }) {
    const root = useRef(null);
    const counter = useRef(null);
    const lenis = useLenis();

    // Freeze scrolling while the intro plays; released when the preloader unmounts
    useEffect(() => {
        if (!lenis) return undefined;
        lenis.stop();
        return () => lenis.start();
    }, [lenis]);

    useGSAP(() => {
        const radius = Math.hypot(window.innerWidth, window.innerHeight);
        const state = { v: 0 };
        const tl = gsap.timeline({
            onComplete: () => {
                try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
                onDone();
            }
        });
        tl.from('[data-pre-ring]', { scale: 0.5, opacity: 0, rotate: -120, duration: 1.4, stagger: 0.12, ease: 'expo.out', transformOrigin: '50% 50%' })
            .from('[data-pre-copy]', { y: 14, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.2)
            .to(state, {
                v: 100,
                duration: 1.6,
                ease: 'power2.inOut',
                onUpdate: () => { counter.current.textContent = String(Math.round(state.v)).padStart(3, '0'); }
            }, 0.15)
            .to('[data-pre-bar]', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0.15)
            .to('[data-pre-ring]', { rotate: '+=90', duration: 1.6, ease: 'power2.inOut', stagger: 0.05 }, 0.15)
            .to('[data-pre-copy], [data-pre-mark]', { opacity: 0, y: -12, duration: 0.45, stagger: 0.04, ease: 'power2.in' })
            .fromTo(root.current, { '--hole': '0px' }, { '--hole': `${radius}px`, duration: 1.15, ease: 'expo.inOut' }, '-=0.15');
    }, { scope: root });

    return (
        <div
            ref={root}
            className="preloader fixed inset-0 z-[100] grid place-items-center bg-ink"
            style={{ '--hole': '0px' }}
            role="status"
            aria-label="Loading NewsLens"
        >
            <div className="relative grid place-items-center">
                <svg viewBox="0 0 100 100" className="h-56 w-56 md:h-72 md:w-72" aria-hidden="true">
                    {RINGS.map(({ r, ticks, long, opacity }) => (
                        <g key={r} data-pre-ring>
                            <circle cx="50" cy="50" r={r} fill="none" stroke={`rgba(103,232,249,${opacity})`} strokeWidth="0.3" />
                            {Array.from({ length: ticks }, (_, i) => {
                                const a = (i / ticks) * Math.PI * 2;
                                const len = i % long === 0 ? 2.6 : 1.2;
                                return (
                                    <line key={i} x1={50 + Math.cos(a) * r} y1={50 + Math.sin(a) * r} x2={50 + Math.cos(a) * (r - len)} y2={50 + Math.sin(a) * (r - len)}
                                        stroke={`rgba(103,232,249,${opacity})`} strokeWidth="0.3" />
                                );
                            })}
                        </g>
                    ))}
                </svg>
                <div data-pre-mark className="absolute grid place-items-center">
                    <LogoMark className="h-10 w-10 text-lens" />
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-10 mx-auto flex max-w-[90rem] items-end justify-between px-6 md:bottom-14 md:px-12">
                <div data-pre-copy>
                    <p className="eyebrow">NewsLens · Credibility engine</p>
                    <p className="mt-2 font-display text-2xl font-light italic text-paper md:text-3xl">Calibrating the lens…</p>
                </div>
                <div data-pre-copy className="text-right">
                    <span ref={counter} className="font-display text-6xl font-light tabular-nums text-paper md:text-8xl">000</span>
                </div>
            </div>
            <div className="absolute inset-x-6 bottom-6 h-px bg-white/[0.08] md:inset-x-12 md:bottom-8">
                <div data-pre-bar className="h-full origin-left scale-x-0 bg-lens" />
            </div>
        </div>
    );
}
