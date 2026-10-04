import { motion } from 'framer-motion';
import { TIER_COPY } from '../../lib/verdict';

/** Small ring + label used on news cards. */
export default function TrustMeter({ score, tier, size = 38 }) {
    const { label, tone } = TIER_COPY[tier] || TIER_COPY.MODERATE;
    const r = size / 2 - 3;
    const c = 2 * Math.PI * r;
    return (
        <div className="flex items-center gap-2.5" title={`Trust score ${score}/100 - ${label}`}>
            <div className="relative grid place-items-center" style={{ width: size, height: size }}>
                <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                    <motion.circle
                        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone.hex} strokeWidth="3" strokeLinecap="round" strokeDasharray={c}
                        initial={{ strokeDashoffset: c }}
                        whileInView={{ strokeDashoffset: c * (1 - score / 100) }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    />
                </svg>
                <span className={`font-mono text-[0.7rem] ${tone.text}`}>{score}</span>
            </div>
            <span className={`font-mono text-[0.65rem] uppercase tracking-wider ${tone.text}`}>{label}</span>
        </div>
    );
}
