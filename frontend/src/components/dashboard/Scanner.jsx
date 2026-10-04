/**
 * Full-screen analysis overlay: rotating aperture rings, a radar sweep and the real pipeline steps.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import { LogoMark } from '../brand/Logo';

function Aperture() {
    const ref = useRef(null);
    useGSAP(() => {
        const mm = gsap.matchMedia();
        mm.add(MEDIA.motion, () => {
            gsap.to('[data-ring="a"]', { rotate: 360, duration: 14, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
            gsap.to('[data-ring="b"]', { rotate: -360, duration: 9, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
            gsap.to('[data-sweep]', { rotate: 360, duration: 2.4, repeat: -1, ease: 'none' });
            gsap.fromTo('[data-core]', { scale: 0.9 }, { scale: 1.08, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.from('[data-blip]', { scale: 0, opacity: 0, duration: 0.6, stagger: { each: 0.4, repeat: -1, repeatDelay: 1.6 }, ease: 'back.out(3)' });
        });
        return () => mm.revert();
    }, { scope: ref });

    return (
        <div ref={ref} className="relative h-64 w-64 md:h-72 md:w-72">
            <div data-sweep className="absolute inset-6 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(103,232,249,0.0) 250deg, rgba(103,232,249,0.35) 360deg)' }} />
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
                <g data-ring="a">
                    <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(103,232,249,0.35)" strokeWidth="0.6" />
                    {Array.from({ length: 72 }, (_, i) => {
                        const a = (i / 72) * Math.PI * 2;
                        const inner = i % 6 === 0 ? 88 : 92;
                        return <line key={i} x1={100 + Math.cos(a) * inner} y1={100 + Math.sin(a) * inner} x2={100 + Math.cos(a) * 95} y2={100 + Math.sin(a) * 95} stroke="rgba(103,232,249,0.4)" strokeWidth="0.6" />;
                    })}
                </g>
                <g data-ring="b">
                    <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(167,139,250,0.45)" strokeWidth="0.8" strokeDasharray="2 6" />
                    <circle cx="100" cy="28" r="2.5" fill="#A78BFA" />
                </g>
                <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
                {[[62, 70], [140, 84], [118, 140], [74, 128]].map(([x, y], i) => (
                    <circle key={i} data-blip cx={x} cy={y} r="2.2" fill={i % 2 ? '#FB7185' : '#34D399'} />
                ))}
            </svg>
            <div data-core className="absolute inset-0 grid place-items-center">
                <div className="grid h-20 w-20 place-items-center rounded-full border border-lens/30 bg-ink/80 shadow-[0_0_60px_-10px_rgba(103,232,249,0.6)]">
                    <LogoMark className="h-9 w-9 text-lens" />
                </div>
            </div>
        </div>
    );
}

export default function Scanner({ active, steps }) {
    const [index, setIndex] = useState(0);
    const label = useRef(null);

    useEffect(() => {
        if (!active) return undefined;
        setIndex(0);
        const timer = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), 1150);
        return () => clearInterval(timer);
    }, [active, steps.length]);

    useEffect(() => {
        if (!active || !label.current) return;
        if (window.matchMedia(MEDIA.reduce).matches) {
            label.current.textContent = steps[index];
            return;
        }
        gsap.to(label.current, { duration: 0.7, scrambleText: { text: steps[index], chars: 'lowerCase', speed: 0.5 } });
    }, [index, active, steps]);

    return createPortal(
        <AnimatePresence>
            {active && (
                <motion.div
                    className="fixed inset-0 z-[70] grid place-items-center bg-ink/85 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.4 } }}
                    role="status"
                    aria-live="polite"
                >
                    <motion.div
                        className="flex flex-col items-center px-6 text-center"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.04, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <Aperture />
                        <p ref={label} className="mt-8 min-h-[2.5rem] font-display text-3xl font-light text-paper">{steps[0]}</p>
                        <ol className="mt-6 w-72 space-y-2 text-left">
                            {steps.map((step, i) => (
                                <li key={step} className={`flex items-center gap-3 text-sm transition-colors duration-300 ${i < index ? 'text-muted' : i === index ? 'text-paper' : 'text-faint'}`}>
                                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10">
                                        {i < index ? <Check className="h-3 w-3 text-real" /> : i === index ? <Loader2 className="h-3 w-3 animate-spin text-lens" /> : <span className="h-1 w-1 rounded-full bg-faint" />}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
