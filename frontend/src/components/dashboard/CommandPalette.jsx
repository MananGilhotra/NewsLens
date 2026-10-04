/**
 * Command palette (⌘K / Ctrl K): paste a link or text to fact-check it from anywhere,
 * search the feed, or jump between sections.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Link2, ScanSearch, Newspaper, ScanFace, LogOut, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import useLogout from '../../hooks/useLogout';

const ease = [0.16, 1, 0.3, 1];
const URL_RE = /^(https?:\/\/|www\.)\S+\.\S+$/i; // whole input must be one link - a link followed by words is text

export default function CommandPalette({ open, onClose }) {
    const navigate = useNavigate();
    const logout = useLogout();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const input = useRef(null);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setActive(0);
        setTimeout(() => input.current?.focus(), 30);
    }, [open]);

    const items = useMemo(() => {
        const q = query.trim();
        const isUrl = URL_RE.test(q);
        const url = isUrl && !/^https?:/i.test(q) ? `https://${q}` : q;
        const list = [];
        if (isUrl) {
            let host = '';
            try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* not a URL after all */ }
            list.push({ id: 'check-url', group: 'Fact-check', icon: Link2, label: 'Fact-check this link', hint: host, run: () => navigate(`/app/check?url=${encodeURIComponent(url)}`) });
        } else if (q.length >= 10) {
            list.push({ id: 'check-text', group: 'Fact-check', icon: ScanSearch, label: 'Fact-check this text', hint: `${q.length} chars`, run: () => navigate('/app/check', { state: { text: q } }) });
        }
        if (q && !isUrl) {
            list.push({ id: 'search-feed', group: 'Fact-check', icon: Search, label: `Search the feed for “${q.length > 40 ? `${q.slice(0, 40)}…` : q}”`, run: () => navigate(`/app/feed?q=${encodeURIComponent(q)}`) });
        }
        const nav = [
            { id: 'go-feed', icon: Newspaper, label: 'Go to feed', keywords: 'news feed home stories', run: () => navigate('/app/feed') },
            { id: 'go-check', icon: ScanSearch, label: 'Open fact-check', keywords: 'analyse verify check true', run: () => navigate('/app/check') },
            { id: 'go-deepfake', icon: ScanFace, label: 'Inspect an image or video', keywords: 'deepfake image photo video ai media', run: () => navigate('/app/deepfake') },
            { id: 'logout', icon: LogOut, label: 'Log out', keywords: 'sign out exit account', run: logout }
        ].filter((item) => !q || isUrl || q.length >= 10 || `${item.label} ${item.keywords}`.toLowerCase().includes(q.toLowerCase()))
            .map((item) => ({ ...item, group: item.id === 'logout' ? 'Account' : 'Navigate' }));
        return [...list, ...nav];
    }, [query, navigate, logout]);

    useEffect(() => { setActive(0); }, [query]);

    const run = (item) => {
        if (!item) return;
        onClose();
        item.run();
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => (i + 1) % Math.max(items.length, 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            run(items[active]);
        } else if (event.key === 'Escape') {
            onClose();
        }
    };

    let lastGroup = null;
    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-[14vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Command palette"
                        initial={{ opacity: 0, y: -14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.35, ease }}
                        className="edge-lit relative w-full max-w-xl overflow-hidden rounded-3xl bg-ink-700/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
                    >
                        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5">
                            <Search className="h-4 w-4 shrink-0 text-faint" />
                            <input
                                ref={input}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Paste a link or text to fact-check, or search…"
                                className="h-14 flex-1 bg-transparent text-[0.95rem] text-paper outline-none placeholder:text-faint"
                                aria-label="Command"
                                aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
                            />
                            <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-faint">ESC</kbd>
                        </div>
                        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox" data-lenis-prevent>
                            {items.map((item, i) => {
                                const showGroup = item.group !== lastGroup;
                                lastGroup = item.group;
                                return (
                                    <li key={item.id}>
                                        {showGroup && <p className="px-3 pb-1.5 pt-3 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-faint">{item.group}</p>}
                                        <button
                                            id={`cmd-${item.id}`}
                                            type="button"
                                            role="option"
                                            aria-selected={active === i}
                                            onMouseMove={() => setActive(i)}
                                            onClick={() => run(item)}
                                            className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active === i ? 'text-paper' : 'text-muted'}`}
                                        >
                                            {active === i && <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-xl bg-white/[0.06]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                                            <item.icon className={`relative h-4 w-4 shrink-0 ${active === i ? 'text-lens' : 'text-faint'}`} strokeWidth={1.75} />
                                            <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
                                            {item.hint && <span className="relative font-mono text-[0.65rem] text-faint">{item.hint}</span>}
                                            {active === i && <CornerDownLeft className="relative h-3.5 w-3.5 text-faint" />}
                                        </button>
                                    </li>
                                );
                            })}
                            {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-faint">No matching commands</li>}
                        </ul>
                        <div className="flex items-center gap-4 border-t border-white/[0.07] px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-wider text-faint">
                            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
                            <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
                            <span className="ml-auto">NewsLens</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
