/**
 * Masthead navigation: numbered links + live local clock. Condenses into a glass pill on scroll,
 * hides while scrolling down, and opens a full-screen menu on small screens.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { ArrowUpRight } from 'lucide-react';
import Logo from '../brand/Logo';
import { useAuth } from '../../context/AuthContext';

const ease = [0.16, 1, 0.3, 1];
const LINKS = [
    ['#how-it-works', 'Method'],
    ['#demo', 'Try it'],
    ['#model', 'Model'],
    ['#faq', 'FAQ']
];

function useClock() {
    const format = () => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date());
    const [time, setTime] = useState(format);
    useEffect(() => {
        const timer = setInterval(() => setTime(format()), 20000);
        return () => clearInterval(timer);
    }, []);
    return time;
}

function MenuButton({ open, onClick }) {
    return (
        <button type="button" onClick={onClick} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 md:hidden">
            <motion.span className="absolute h-px w-4 bg-paper" animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -3 }} transition={{ duration: 0.35, ease }} />
            <motion.span className="absolute h-px w-4 bg-paper" animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 3 }} transition={{ duration: 0.35, ease }} />
        </button>
    );
}

export default function LandingNav() {
    const { isAuthenticated } = useAuth();
    const { scrollY } = useScroll();
    const lenis = useLenis();
    const time = useClock();
    const [hidden, setHidden] = useState(false);
    const [solid, setSolid] = useState(false);
    const [open, setOpen] = useState(false);

    useMotionValueEvent(scrollY, 'change', (y) => {
        const previous = scrollY.getPrevious() ?? 0;
        setHidden(!open && y > previous && y > 500);
        setSolid(y > 40);
    });

    useEffect(() => {
        if (open) lenis?.stop();
        else lenis?.start();
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, lenis]);

    const go = (href) => {
        setOpen(false);
        setTimeout(() => lenis ? lenis.scrollTo(href, { offset: -20 }) : document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }), 350);
    };

    return (
        <>
            <motion.header
                initial={{ y: -90, opacity: 0 }}
                animate={{ y: hidden ? -100 : 0, opacity: 1 }}
                transition={{ duration: 0.7, ease }}
                className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4"
            >
                <nav className={`mx-auto flex max-w-[90rem] items-center justify-between rounded-full py-2 pl-4 pr-2 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-500 md:pl-6 ${solid || open ? 'border border-white/[0.08] bg-ink/70 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl' : 'border border-transparent'}`}>
                    <Logo />
                    <ul className="hidden items-center gap-1 md:flex">
                        {LINKS.map(([href, label], i) => (
                            <li key={href}>
                                <a href={href} className="group flex items-baseline gap-1.5 rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-paper">
                                    <span className="font-mono text-[0.6rem] text-faint transition-colors group-hover:text-lens">0{i + 1}</span>
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-2">
                        <span className="hidden font-mono text-[0.68rem] uppercase tracking-wider text-faint lg:inline">{time}</span>
                        <span className="mx-2 hidden h-4 w-px bg-white/10 lg:inline-block" />
                        {isAuthenticated ? (
                            <Link to="/app" className="btn-primary px-5 py-2.5">Open app <ArrowUpRight className="h-4 w-4" /></Link>
                        ) : (
                            <>
                                <Link to="/login" className="btn hidden px-4 py-2.5 text-muted hover:text-paper sm:inline-flex">Log in</Link>
                                <Link to="/signup" className="btn-primary px-5 py-2.5">Get started</Link>
                            </>
                        )}
                        <MenuButton open={open} onClick={() => setOpen((o) => !o)} />
                    </div>
                </nav>
            </motion.header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="fixed inset-0 z-40 flex flex-col bg-ink/95 px-6 pb-10 pt-28 backdrop-blur-2xl md:hidden"
                        initial={{ clipPath: 'circle(0% at 92% 6%)' }}
                        animate={{ clipPath: 'circle(150% at 92% 6%)' }}
                        exit={{ clipPath: 'circle(0% at 92% 6%)', transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] } }}
                        transition={{ duration: 0.7, ease: [0.83, 0, 0.17, 1] }}
                    >
                        <ul className="space-y-1">
                            {LINKS.map(([href, label], i) => (
                                <motion.li key={href} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.7, ease }}>
                                    <button type="button" onClick={() => go(href)} className="flex w-full items-baseline gap-4 border-b border-white/[0.06] py-4 text-left">
                                        <span className="font-mono text-xs text-lens">0{i + 1}</span>
                                        <span className="font-display text-5xl font-light text-paper">{label}</span>
                                    </button>
                                </motion.li>
                            ))}
                        </ul>
                        <motion.div className="mt-auto flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                            <span className="font-mono text-xs uppercase tracking-wider text-faint">{time}</span>
                            {!isAuthenticated && <Link to="/login" className="btn-ghost">Log in</Link>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
