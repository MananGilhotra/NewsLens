/**
 * App shell: sticky glass header with animated tabs, live service status and user menu.
 * Sections cross-fade on navigation; mobile gets a bottom tab bar.
 */

import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Newspaper, ScanSearch, ScanFace, LogOut, ChevronDown, Search } from 'lucide-react';
import Logo from '../brand/Logo';
import { useAuth } from '../../context/AuthContext';
import { useHealth } from '../../context/HealthContext';
import CommandPalette from './CommandPalette';
import useLogout from '../../hooks/useLogout';

const ease = [0.16, 1, 0.3, 1];
const TABS = [
    { to: '/app/feed', label: 'Feed', icon: Newspaper },
    { to: '/app/check', label: 'Fact-check', icon: ScanSearch },
    { to: '/app/deepfake', label: 'Deepfake', icon: ScanFace }
];

function StatusChip() {
    const { health, online } = useHealth();
    const [open, setOpen] = useState(false);
    const services = health?.services;
    const rows = services ? [
        ['Database', services.database === 'connected', services.database === 'connected' ? 'Connected' : 'Unavailable'],
        ['NewsLens model', services.model?.loaded, services.model?.loaded ? `v${services.model.version}` : 'Not trained'],
        ['AI cross-check', services.llm?.enabled, services.llm?.enabled ? services.llm.providers.map((p) => ({ groq: 'Groq', openrouter: 'OpenRouter' }[p.name] || p.name)).join(' → ') : 'Not configured'],
        ['Live web check', services.llm?.webSearch, services.llm?.webSearch ? 'On for fact-checks' : 'Off'],
        ['News source', true, services.news === 'rss' ? 'Public RSS feeds' : 'NewsAPI + RSS'],
        ['Published fact-checks', services.factCheck || services.llm?.webSearch, services.factCheck ? 'Google Fact Check' : services.llm?.webSearch ? 'Via AI web search' : 'Off']
    ] : [];
    const color = online === false ? 'bg-fake' : online ? 'bg-real' : 'bg-faint';

    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:text-paper"
                aria-expanded={open}
                aria-label="Service status"
            >
                <span className={`h-1.5 w-1.5 rounded-full ${color} ${online ? 'animate-pulse-dot' : ''}`} />
                <span className="hidden sm:inline">{online === false ? 'Offline' : services?.llm?.enabled ? 'Model + AI' : 'Model'}</span>
            </button>
            <AnimatePresence>
                {open && services && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="glass absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl p-2 shadow-2xl"
                    >
                        {rows.map(([name, ok, detail]) => (
                            <div key={name} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm">
                                <span className="flex items-center gap-2 text-paper">
                                    <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-real' : 'bg-faint'}`} /> {name}
                                </span>
                                <span className="truncate font-mono text-[0.65rem] text-faint">{detail}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function UserMenu() {
    const { user } = useAuth();
    const logout = useLogout();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const initials = (user?.name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

    useEffect(() => {
        const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full p-1 pr-2 transition-colors hover:bg-white/[0.04]" aria-expanded={open} aria-label="Account menu">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-lens to-violet text-xs font-semibold text-ink">{initials}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="glass absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-2xl p-2 shadow-2xl"
                    >
                        <div className="px-3 py-2.5">
                            <div className="truncate text-sm text-paper">{user?.name || 'Signed in'}</div>
                            <div className="truncate text-xs text-faint">{user?.email}</div>
                        </div>
                        <button
                            type="button"
                            onClick={logout}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-white/[0.05] hover:text-fake"
                        >
                            <LogOut className="h-4 w-4" /> Log out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PaletteTrigger({ onOpen }) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    return (
        <>
            <button type="button" onClick={onOpen}
                className="group hidden h-9 w-64 items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.02] pl-3.5 pr-2 text-left text-sm text-faint transition-colors hover:border-white/15 hover:text-muted lg:flex">
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">Search or paste a link…</span>
                <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-faint">{isMac ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            <button type="button" onClick={onOpen} className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] text-muted lg:hidden" aria-label="Open command palette">
                <Search className="h-4 w-4" />
            </button>
        </>
    );
}

export default function DashboardLayout() {
    const location = useLocation();
    const outlet = useOutlet();
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        const onKey = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setPaletteOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="grain min-h-screen bg-ink">
            <div aria-hidden="true" className="pointer-events-none fixed -top-40 left-1/4 h-[30rem] w-[30rem] rounded-full bg-violet-deep/10 blur-[140px]" />
            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/75 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-6 px-4 md:px-8">
                    <Logo />
                    <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 md:flex" aria-label="Sections">
                        {TABS.map(({ to, label, icon: Icon }) => (
                            <NavLink key={to} to={to} className={({ isActive }) => `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-paper'}`}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && <motion.span layoutId="dashboard-tab" className="absolute inset-0 rounded-full bg-paper" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                                        <Icon className="relative h-4 w-4" strokeWidth={1.75} />
                                        <span className="relative">{label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        <PaletteTrigger onOpen={() => setPaletteOpen(true)} />
                        <StatusChip />
                        <UserMenu />
                    </div>
                </div>
            </header>

            <main className="relative mx-auto max-w-[90rem] px-4 pb-32 pt-8 md:px-8 md:pb-20 md:pt-12">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.22 } }}
                        transition={{ duration: 0.5, ease }}
                    >
                        {outlet}
                    </motion.div>
                </AnimatePresence>
            </main>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

            {/* Mobile tab bar */}
            <nav className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full p-1.5 md:hidden" aria-label="Sections">
                {TABS.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[0.65rem] ${isActive ? 'text-ink' : 'text-muted'}`}>
                        {({ isActive }) => (
                            <>
                                {isActive && <motion.span layoutId="dashboard-tab-mobile" className="absolute inset-0 rounded-full bg-paper" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                                <Icon className="relative h-[18px] w-[18px]" strokeWidth={1.75} />
                                <span className="relative">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
