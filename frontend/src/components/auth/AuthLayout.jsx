/**
 * Split-screen shell for login/signup: animated lens artwork on the left, form on the right.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../brand/Logo';

const ease = [0.16, 1, 0.3, 1];
const CHIPS = [
    { text: 'Central bank holds rates steady', tone: 'real', score: 94, x: '8%', y: '15%' },
    { text: 'Leaked memo PROVES moon landing staged', tone: 'fake', score: 3, x: '10%', y: '50%' },
    { text: 'Study links coffee to longer life', tone: 'unsure', score: 49, x: '38%', y: '32%' }
];
const TONE = { real: 'border-real/40 text-real', fake: 'border-fake/40 text-fake', unsure: 'border-unsure/40 text-unsure' };

function LensArt() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <div aria-hidden="true" className="absolute left-1/4 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-deep/25 blur-[120px]" />
            <div aria-hidden="true" className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-lens-deep/15 blur-[120px]" />
            {[340, 250, 160].map((size, i) => (
                <motion.div
                    key={size}
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 rounded-full border border-lens/20"
                    style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderStyle: i === 1 ? 'dashed' : 'solid' }}
                    initial={{ scale: 0.4, opacity: 0, rotate: -40 }}
                    animate={{ scale: 1, opacity: 1, rotate: i % 2 ? -360 : 360 }}
                    transition={{ scale: { duration: 1.6, delay: i * 0.12, ease }, opacity: { duration: 1.2, delay: i * 0.12 }, rotate: { duration: 60 + i * 20, repeat: Infinity, ease: 'linear' } }}
                />
            ))}
            {CHIPS.map((chip, i) => (
                <motion.div
                    key={chip.text}
                    className="absolute"
                    style={{ left: chip.x, top: chip.y }}
                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: [0, -10, 0], filter: 'blur(0px)' }}
                    transition={{ opacity: { delay: 0.6 + i * 0.25, duration: 0.8 }, filter: { delay: 0.6 + i * 0.25, duration: 0.8 }, y: { delay: 0.6 + i * 0.25, duration: 6 + i, repeat: Infinity, ease: 'easeInOut' } }}
                >
                    <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase ${TONE[chip.tone]}`}>{chip.tone} {chip.score}</span>
                        <span className="whitespace-nowrap font-display text-base text-paper">{chip.text}</span>
                    </div>
                </motion.div>
            ))}
            <div className="absolute bottom-10 left-10 right-10">
                <p className="font-display text-3xl font-light leading-tight text-paper">
                    “A lie can travel halfway around the world while the truth is putting on its shoes.”
                </p>
                <p className="mt-3 eyebrow">Proverb, often misattributed - which proves the point</p>
            </div>
        </div>
    );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <div className="grain grid grid-cols-1 min-h-screen bg-ink lg:grid-cols-[1.05fr_1fr]">
            <div className="relative hidden border-r border-white/[0.06] lg:block">
                <div className="absolute left-10 top-8 z-10"><Logo /></div>
                <LensArt />
            </div>
            <div className="relative flex flex-col px-6 py-8 md:px-12">
                <div className="flex items-center justify-between">
                    <div className="lg:hidden"><Logo /></div>
                    <Link to="/" className="ml-auto inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-paper">
                        <ArrowLeft className="h-4 w-4" /> Back to home
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center py-12">
                    <motion.div
                        className="w-full max-w-md"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease, delay: 0.15 }}
                    >
                        <h1 className="font-display text-5xl font-light text-paper">{title}</h1>
                        <p className="mt-3 text-muted">{subtitle}</p>
                        <div className="mt-10">{children}</div>
                        {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
