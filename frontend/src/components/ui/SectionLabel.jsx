/**
 * Editorial section label: (01) - LABEL ------------- (the rule draws in on scroll)
 */

import { motion } from 'framer-motion';

export default function SectionLabel({ index, children, className = '', aside }) {
    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <span className="font-mono text-[0.7rem] text-lens">({String(index).padStart(2, '0')})</span>
            <span className="eyebrow whitespace-nowrap">{children}</span>
            <motion.span
                aria-hidden="true"
                className="h-px flex-1 origin-left bg-gradient-to-r from-white/20 to-white/[0.04]"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-5%' }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {aside && <span className="eyebrow hidden whitespace-nowrap text-faint md:inline">{aside}</span>}
        </div>
    );
}
