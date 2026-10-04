/**
 * Headline that rises into view word by word (or char by char) from behind line masks.
 * trigger="load" animates on mount, trigger="scroll" when it scrolls into view.
 * active={false} keeps it hidden until it flips to true (e.g. after the preloader).
 */

import { useRef } from 'react';
import { gsap, useGSAP, SplitText, MEDIA } from '../../lib/gsap';

export default function SplitReveal({ as: Tag = 'h2', children, className = '', type = 'words', trigger = 'scroll', delay = 0, stagger = 0.06, duration = 1.1, active = true }) {
    const ref = useRef(null);

    useGSAP((context, contextSafe) => {
        if (window.matchMedia(MEDIA.reduce).matches) return undefined;
        const el = ref.current;
        let split;
        let alive = true;
        gsap.set(el, { autoAlpha: 0 }); // hidden until split, avoids a flash of unsplit text
        if (!active) return undefined;

        const run = contextSafe(() => {
            if (!alive) return;
            gsap.set(el, { autoAlpha: 1 });
            split = SplitText.create(el, {
                type: type === 'chars' ? 'words,chars' : 'lines,words',
                mask: type === 'chars' ? 'words' : 'lines',
                autoSplit: true,
                onSplit: (self) => gsap.from(type === 'chars' ? self.chars : self.words, {
                    yPercent: 115,
                    rotate: type === 'chars' ? 8 : 2,
                    duration,
                    delay,
                    stagger,
                    ease: 'expo.out',
                    scrollTrigger: trigger === 'scroll' ? { trigger: el, start: 'top 88%', once: true } : undefined
                })
            });
        });

        // measure lines with the real web font, not the fallback
        if (!document.fonts || document.fonts.status === 'loaded') run();
        else document.fonts.ready.then(run);

        return () => {
            alive = false;
            split?.revert();
        };
    }, { scope: ref, dependencies: [active], revertOnUpdate: true });

    return <Tag ref={ref} className={className}>{children}</Tag>;
}
