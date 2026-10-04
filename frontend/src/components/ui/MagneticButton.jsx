/**
 * Button/link that leans toward the cursor with spring physics (mouse pointers only).
 * as: 'button' | 'a' | 'link' (react-router Link)
 */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

const MotionLink = motion.create(Link);
const COMPONENTS = { button: motion.button, a: motion.a, link: MotionLink };

export default function MagneticButton({ as = 'button', strength = 0.3, className = '', children, ...props }) {
    const ref = useRef(null);
    const reduceMotion = useReducedMotion();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
    const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

    const onPointerMove = (event) => {
        if (reduceMotion || event.pointerType !== 'mouse' || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * strength);
        y.set((event.clientY - rect.top - rect.height / 2) * strength);
    };
    const reset = () => {
        x.set(0);
        y.set(0);
    };

    const Component = COMPONENTS[as] || motion.button;
    return (
        <Component
            ref={ref}
            className={className}
            style={{ x: springX, y: springY }}
            onPointerMove={onPointerMove}
            onPointerLeave={reset}
            whileTap={{ scale: 0.96 }}
            {...props}
        >
            {children}
        </Component>
    );
}
