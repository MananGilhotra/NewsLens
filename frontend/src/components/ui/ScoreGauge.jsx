/**
 * Circular score gauge - ring and number animate together with GSAP.
 */

import { useRef } from 'react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import { toneForScore } from '../../lib/verdict';

export default function ScoreGauge({ score, size = 220, stroke = 10, label = 'Credibility', delay = 0.15, tone: toneOverride, compact = false }) {
    const root = useRef(null);
    const tone = toneOverride || toneForScore(score);
    const radius = (size - stroke) / 2 - 4;
    const circumference = 2 * Math.PI * radius;
    const ticks = compact ? [] : Array.from({ length: 48 }, (_, i) => i);

    useGSAP(() => {
        const ring = root.current.querySelector('[data-ring]');
        const number = root.current.querySelector('[data-number]');
        const mm = gsap.matchMedia();
        mm.add({ motion: MEDIA.motion, reduce: MEDIA.reduce }, (ctx) => {
            const target = { value: 0 };
            const finalOffset = circumference * (1 - score / 100);
            if (ctx.conditions.reduce) {
                gsap.set(ring, { strokeDashoffset: finalOffset });
                number.textContent = String(score);
                return;
            }
            gsap.fromTo(ring, { strokeDashoffset: circumference }, { strokeDashoffset: finalOffset, duration: 1.6, delay, ease: 'expo.out' });
            gsap.to(target, {
                value: score,
                duration: 1.6,
                delay,
                ease: 'expo.out',
                onUpdate: () => { number.textContent = String(Math.round(target.value)); }
            });
        });
        return () => mm.revert();
    }, { scope: root, dependencies: [score, circumference] });

    return (
        <div ref={root} className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score} out of 100`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {ticks.map((i) => {
                    const angle = (i / ticks.length) * Math.PI * 2;
                    const inner = radius + stroke / 2 + 5;
                    const outer = inner + (i % 4 === 0 ? 7 : 3);
                    return (
                        <line
                            key={i}
                            x1={size / 2 + Math.cos(angle) * inner}
                            y1={size / 2 + Math.sin(angle) * inner}
                            x2={size / 2 + Math.cos(angle) * outer}
                            y2={size / 2 + Math.sin(angle) * outer}
                            stroke="rgba(255,255,255,0.14)"
                            strokeWidth={1}
                        />
                    );
                })}
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
                <circle
                    data-ring
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={tone.hex}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    style={{ filter: `drop-shadow(0 0 ${compact ? 4 : 12}px ${tone.hex}66)` }}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                    <div data-number className={`font-display leading-none tabular-nums ${tone.text} ${compact ? (size >= 120 ? 'text-5xl font-light' : 'text-base font-medium') : 'text-[4.2rem] font-light'}`}>0</div>
                    {!compact && <div className="eyebrow mt-2">{label}</div>}
                </div>
            </div>
        </div>
    );
}
