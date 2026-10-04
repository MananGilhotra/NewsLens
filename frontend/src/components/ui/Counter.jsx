/**
 * Number that counts up when it scrolls into view.
 */

import { useRef } from 'react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';

export default function Counter({ value, decimals = 0, suffix = '', prefix = '', className = '' }) {
    const ref = useRef(null);
    const format = (v) => `${prefix}${v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

    useGSAP(() => {
        if (value == null || Number.isNaN(value)) return;
        const mm = gsap.matchMedia();
        mm.add({ motion: MEDIA.motion, reduce: MEDIA.reduce }, (ctx) => {
            if (ctx.conditions.reduce) {
                ref.current.textContent = format(value);
                return;
            }
            const state = { v: 0 };
            gsap.to(state, {
                v: value,
                duration: 2.2,
                ease: 'expo.out',
                scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
                onUpdate: () => { ref.current.textContent = format(state.v); }
            });
        });
        return () => mm.revert();
    }, { dependencies: [value], scope: ref });

    return <span ref={ref} className={className}>{value == null ? '—' : format(0)}</span>;
}
