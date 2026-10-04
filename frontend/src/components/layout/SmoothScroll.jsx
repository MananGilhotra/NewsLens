/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Disabled for users who prefer reduced motion.
 */

import { useEffect, useRef } from 'react';
import { ReactLenis } from 'lenis/react';
import { useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { gsap, ScrollTrigger } from '../../lib/gsap';

export default function SmoothScroll({ children }) {
    const lenisRef = useRef(null);
    const reduceMotion = useReducedMotion();
    const { pathname } = useLocation();

    useEffect(() => {
        if (reduceMotion) return undefined;
        const update = (time) => lenisRef.current?.lenis?.raf(time * 1000);
        gsap.ticker.add(update);
        gsap.ticker.lagSmoothing(0);
        const lenis = lenisRef.current?.lenis;
        lenis?.on('scroll', ScrollTrigger.update);
        return () => {
            gsap.ticker.remove(update);
            lenis?.off('scroll', ScrollTrigger.update);
        };
    }, [reduceMotion]);

    // New page starts at the top
    useEffect(() => {
        const lenis = lenisRef.current?.lenis;
        if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
        else window.scrollTo(0, 0);
    }, [pathname]);

    if (reduceMotion) return children;

    return (
        <ReactLenis root autoRaf={false} ref={lenisRef} options={{ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true, anchors: { offset: -24 } }}>
            {children}
        </ReactLenis>
    );
}
