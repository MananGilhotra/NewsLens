/**
 * Custom cursor for the landing page (fine pointers only): a dot and a lagging lens ring that
 * grows over links and shows a label from data-cursor="…". Hidden where the hero lens takes over.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap, MEDIA } from '../../lib/gsap';

export default function Cursor() {
    const dot = useRef(null);
    const ring = useRef(null);
    const label = useRef(null);

    useEffect(() => {
        const fine = window.matchMedia('(pointer: fine)').matches;
        if (!fine || window.matchMedia(MEDIA.reduce).matches) return undefined;
        const html = document.documentElement;
        html.classList.add('has-custom-cursor');

        const dotX = gsap.quickTo(dot.current, 'x', { duration: 0.1, ease: 'power3.out' });
        const dotY = gsap.quickTo(dot.current, 'y', { duration: 0.1, ease: 'power3.out' });
        const ringX = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3.out' });
        const ringY = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3.out' });
        let mode = '';
        let shown = false;

        const setMode = (next, text = '') => {
            if (next === mode && label.current.textContent === text) return;
            mode = next;
            label.current.textContent = text;
            gsap.to(ring.current, {
                scale: next === 'hidden' ? 0 : next === 'label' ? 2.6 : next === 'link' ? 1.7 : 1,
                opacity: next === 'hidden' ? 0 : 1,
                duration: 0.4,
                ease: 'expo.out'
            });
            gsap.to(label.current, { opacity: next === 'label' ? 1 : 0, duration: 0.25 });
            gsap.to(dot.current, { scale: next === 'link' || next === 'label' ? 0 : 1, duration: 0.25 });
        };

        const onMove = (event) => {
            if (!shown) {
                shown = true;
                gsap.set(dot.current, { x: event.clientX, y: event.clientY, opacity: 1 });
                gsap.set(ring.current, { x: event.clientX, y: event.clientY });
            }
            dotX(event.clientX);
            dotY(event.clientY);
            ringX(event.clientX);
            ringY(event.clientY);
            const target = event.target instanceof Element ? event.target : null;
            const labelled = target?.closest('[data-cursor]');
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) setMode('hidden');
            else if (labelled) setMode('label', labelled.dataset.cursor);
            else if (target?.closest('a, button, [role="button"], label')) setMode('link');
            else if (target?.closest('[data-cursor-hide]')) setMode('hidden');
            else setMode('default');
        };
        const onDown = () => gsap.to(ring.current, { scale: '-=0.25', duration: 0.15 });
        const onUp = () => { const m = mode; mode = ''; setMode(m, label.current.textContent); };
        const onLeave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.2 });
        const onEnter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.2 });

        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        document.addEventListener('pointerleave', onLeave);
        document.addEventListener('pointerenter', onEnter);
        return () => {
            html.classList.remove('has-custom-cursor');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointerleave', onLeave);
            document.removeEventListener('pointerenter', onEnter);
        };
    }, []);

    return createPortal(
        <div aria-hidden="true" className="custom-cursor pointer-events-none fixed left-0 top-0 z-[95] mix-blend-difference">
            <div ref={ring} className="absolute -left-5 -top-5 grid h-10 w-10 place-items-center rounded-full border border-white opacity-0">
                <span ref={label} className="font-mono text-[0.32rem] uppercase tracking-[0.18em] text-white opacity-0" />
            </div>
            <div ref={dot} className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-white opacity-0" />
        </div>,
        document.body
    );
}
