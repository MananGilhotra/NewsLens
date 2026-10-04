/**
 * Card with a soft light that follows the cursor and a gentle 3D tilt.
 */

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from 'framer-motion';

export default function SpotlightCard({ className = '', children, tilt = 5, color = 'rgba(103,232,249,0.12)', ...props }) {
    const ref = useRef(null);
    const reduceMotion = useReducedMotion();
    const px = useMotionValue(0.5);
    const py = useMotionValue(0.5);
    const rotateX = useSpring(useTransform(py, [0, 1], [tilt, -tilt]), { stiffness: 160, damping: 20 });
    const rotateY = useSpring(useTransform(px, [0, 1], [-tilt, tilt]), { stiffness: 160, damping: 20 });
    const lightX = useTransform(px, (v) => `${v * 100}%`);
    const lightY = useTransform(py, (v) => `${v * 100}%`);
    const background = useMotionTemplate`radial-gradient(420px circle at ${lightX} ${lightY}, ${color}, transparent 65%)`;

    const onPointerMove = (event) => {
        if (event.pointerType !== 'mouse' || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width);
        py.set((event.clientY - rect.top) / rect.height);
    };
    const reset = () => {
        px.set(0.5);
        py.set(0.5);
    };

    return (
        <motion.div
            ref={ref}
            onPointerMove={onPointerMove}
            onPointerLeave={reset}
            style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
            className={`group card overflow-hidden ${className}`}
            {...props}
        >
            <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background }}
            />
            {children}
        </motion.div>
    );
}
