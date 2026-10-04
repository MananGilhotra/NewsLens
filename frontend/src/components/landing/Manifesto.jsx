/**
 * Manifesto: a large editorial statement that comes into focus word by word as you scroll.
 */

import { useRef } from 'react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import SectionLabel from '../ui/SectionLabel';

const SEGMENTS = [
    ['Every day, millions of stories compete for your attention. Some inform. Some'],
    ['manipulate.', 'em'],
    ['NewsLens reads them the way a seasoned editor would - weighing the language, the sources and the evidence - then shows you'],
    ['exactly', 'em'],
    ['what it found. No black box. No'],
    ['blind trust.', 'em']
];

export default function Manifesto() {
    const root = useRef(null);

    useGSAP(() => {
        const mm = gsap.matchMedia();
        mm.add(MEDIA.motion, () => {
            gsap.fromTo(root.current.querySelectorAll('[data-word]'), { opacity: 0.12, filter: 'blur(3px)' }, {
                opacity: 1,
                filter: 'blur(0px)',
                stagger: 0.05,
                ease: 'none',
                scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 }
            });
        });
        return () => mm.revert();
    }, { scope: root });

    let count = 0;
    return (
        <section ref={root} className="relative border-t border-white/[0.06] bg-ink py-28 md:py-40" aria-label="Manifesto">
            <div className="mx-auto max-w-[90rem] px-6 md:px-12">
                <SectionLabel index={1} aside="Why NewsLens">The problem</SectionLabel>
                <p className="mt-14 max-w-[62rem] font-display text-[clamp(2rem,4.6vw,4.4rem)] font-light leading-[1.08] tracking-[-0.02em] text-paper">
                    {SEGMENTS.map(([text, style]) => text.split(' ').map((word) => {
                        count += 1;
                        return (
                            <span key={count} data-word className={`inline-block pr-[0.25em] ${style === 'em' ? 'italic text-lens' : ''}`}>{word}</span>
                        );
                    }))}
                </p>
            </div>
        </section>
    );
}
