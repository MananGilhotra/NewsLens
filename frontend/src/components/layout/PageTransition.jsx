/**
 * Route transition: the new page opens like a camera iris; the old one sinks away.
 * Reduced motion: a plain cross-fade.
 */

import { motion, useReducedMotion } from 'framer-motion';

const IRIS_EASE = [0.83, 0, 0.17, 1];

export default function PageTransition({ children }) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {children}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)', transitionEnd: { clipPath: 'none' } }}
            exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.32, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ duration: 0.95, ease: IRIS_EASE }}
        >
            {children}
        </motion.div>
    );
}
