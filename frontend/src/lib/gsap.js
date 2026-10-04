/**
 * GSAP setup - plugins are registered once here and imported from this module everywhere.
 * (All GSAP plugins, including SplitText and ScrambleText, are free since GSAP 3.13.)
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);

gsap.defaults({ ease: 'expo.out', duration: 0.9 });

/** matchMedia conditions shared by every GSAP animation */
export const MEDIA = {
    motion: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
    desktop: '(min-width: 1024px)',
};

export { gsap, ScrollTrigger, SplitText, useGSAP };
