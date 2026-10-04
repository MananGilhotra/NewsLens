/**
 * Fact-check: analyse pasted text or a link, show the combined verdict and the signals behind it.
 * /app/check?url=... (from the feed) runs immediately.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ScanSearch, Link2, AlignLeft, AlertTriangle, History, Cpu, Bot, Building2, BadgeCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useHealth } from '../../context/HealthContext';
import { useAuth } from '../../context/AuthContext';
import { toneForVerdict, timeAgo } from '../../lib/verdict';
import Scanner from './Scanner';
import ResultView from './ResultView';

const ease = [0.16, 1, 0.3, 1];
const MIN_SCAN_MS = 1800;
const MAX_TEXT = 20000;
const EXAMPLES = [
    { label: 'Viral health claim', text: 'BREAKING: Scientists confirm that drinking hot water with lemon cures cancer within three days. Doctors don’t want you to know this simple trick - share this before it gets deleted!!!' },
    { label: 'Wire-style report', text: 'The European Central Bank kept its key interest rates unchanged on Thursday, saying inflation in the euro area had continued to ease. In a statement released after its policy meeting in Frankfurt, the bank said it would keep borrowing costs at current levels for as long as necessary.' },
    { label: 'Too good to be true', text: 'A local man has reportedly built a working time machine in his garage, according to neighbours who say he has been acting strangely since last Tuesday. Officials have not commented.' }
];

function ModeSwitch({ mode, onChange }) {
    return (
        <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.02] p-1" role="tablist" aria-label="Input type">
            {[['text', 'Text', AlignLeft], ['url', 'Link', Link2]].map(([key, label, Icon]) => (
                <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => onChange(key)}
                    className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm transition-colors ${mode === key ? 'text-ink' : 'text-muted hover:text-paper'}`}>
                    {mode === key && <motion.span layoutId="check-mode" className="absolute inset-0 rounded-full bg-paper" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <Icon className="relative h-4 w-4" /> <span className="relative">{label}</span>
                </button>
            ))}
        </div>
    );
}

function HistoryPanel({ items, available }) {
    if (available === false) return null;
    return (
        <aside className="card h-fit p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-paper"><History className="h-4 w-4 text-lens" /> Recent checks</h2>
            {items.length === 0 ? (
                <p className="mt-4 text-sm text-faint">Your analyses will appear here.</p>
            ) : (
                <ul className="mt-4 space-y-1">
                    <AnimatePresence initial={false}>
                        {items.map((item, i) => {
                            const tone = toneForVerdict(item.verdict);
                            return (
                                <motion.li key={item._id} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, ease }}
                                    className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.03]">
                                    <span className={`mt-0.5 font-display text-lg leading-none ${tone.text}`}>{item.score}</span>
                                    <div className="min-w-0">
                                        <p className="line-clamp-2 text-sm text-paper-dim">{item.title || 'Untitled'}</p>
                                        <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-faint">{item.verdict} · {item.inputType} · {timeAgo(item.createdAt)}</p>
                                    </div>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}
        </aside>
    );
}

export default function FactCheck() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { health } = useHealth();
    const { isAuthenticated } = useAuth();
    const services = health?.services;
    const [mode, setMode] = useState('text');
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [phase, setPhase] = useState('input');
    const [scanMode, setScanMode] = useState('text');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [history, setHistory] = useState({ items: [], available: null });
    const location = useLocation();
    const navigate = useNavigate();
    const lastAuto = useRef(null);

    const loadHistory = useCallback(() => {
        if (!isAuthenticated) return;
        api.get('/analyze/history', { params: { limit: 8 } })
            .then((r) => setHistory({ items: r.data.data, available: r.data.available !== false }))
            .catch(() => setHistory((h) => ({ ...h, available: false })));
    }, [isAuthenticated]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const run = useCallback(async (payload, usedMode) => {
        setError('');
        setScanMode(usedMode);
        setPhase('scanning');
        const started = Date.now();
        try {
            const response = await api.post('/analyze', payload);
            await new Promise((resolve) => setTimeout(resolve, Math.max(0, MIN_SCAN_MS - (Date.now() - started))));
            setResult(response.data.data);
            setPhase('result');
            loadHistory();
        } catch (err) {
            setError(errorMessage(err, 'Analysis failed. Please try again.'));
            setPhase('input');
        }
    }, [loadHistory]);

    // Deep links: /app/check?url=... (feed, palette) or router state { text } (palette)
    useEffect(() => {
        const linked = searchParams.get('url');
        const stateText = location.state?.text;
        const key = linked ? `url:${linked}` : stateText ? `text:${stateText}` : null;
        if (!key) {
            lastAuto.current = null;
            return;
        }
        if (lastAuto.current === key) return;
        lastAuto.current = key;
        if (linked) {
            setMode('url');
            setUrl(linked);
            setSearchParams({}, { replace: true });
            run({ url: linked }, 'url');
        } else {
            setMode('text');
            setText(stateText);
            navigate(location.pathname, { replace: true, state: null });
            run({ text: stateText }, 'text');
        }
    }, [searchParams, setSearchParams, location.state, location.pathname, navigate, run]);

    const steps = useMemo(() => [
        ...(scanMode === 'url' ? ['Fetching the article', 'Extracting readable text'] : ['Normalising the text']),
        'Running the NewsLens model',
        ...(services?.llm?.enabled ? ['AI fact-check of the claims'] : []),
        ...(scanMode === 'url' ? ['Looking up the source'] : []),
        ...(services?.factCheck ? ['Searching published fact-checks'] : []),
        'Weighing the evidence'
    ], [scanMode, services]);

    const canSubmit = mode === 'text' ? text.trim().length >= 10 && text.length <= MAX_TEXT : /^https?:\/\/\S+\.\S+/.test(url.trim());

    const submit = (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        run(mode === 'text' ? { text: text.trim() } : { url: url.trim() }, mode);
    };

    const reset = () => {
        setResult(null);
        setPhase('input');
    };

    return (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_20rem]">
            <Scanner active={phase === 'scanning'} steps={steps} />

            <div className="min-w-0">
                <AnimatePresence mode="wait">
                    {phase === 'result' && result ? (
                        <motion.div key="result" exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                            <ResultView result={result} services={services} onReset={reset} />
                        </motion.div>
                    ) : (
                        <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.5, ease }}>
                            <p className="eyebrow">Fact-check</p>
                            <h1 className="mt-3 font-display text-display-md font-light text-paper">
                                Is it <em className="text-lens">true?</em>
                            </h1>
                            <p className="mt-3 max-w-2xl text-muted">Paste a claim, a paragraph or a whole article - or drop a link and NewsLens will read the page for you.</p>

                            <form onSubmit={submit} className="card mt-8 p-5 md:p-7">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <ModeSwitch mode={mode} onChange={(m) => { setMode(m); setError(''); }} />
                                    {mode === 'text' && <span className={`font-mono text-xs ${text.length > MAX_TEXT ? 'text-fake' : 'text-faint'}`}>{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>}
                                </div>

                                <AnimatePresence mode="wait" initial={false}>
                                    {mode === 'text' ? (
                                        <motion.div key="text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                                            <label htmlFor="check-text" className="sr-only">Text to fact-check</label>
                                            <textarea
                                                id="check-text"
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                rows={8}
                                                data-lenis-prevent
                                                placeholder="Paste a headline, a social media post or an article…"
                                                className="field mt-5 resize-y font-display text-lg leading-relaxed"
                                            />
                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <span className="eyebrow mr-1">Try</span>
                                                {EXAMPLES.map((example) => (
                                                    <button key={example.label} type="button" onClick={() => setText(example.text)} className="chip transition-colors hover:border-lens/40 hover:text-paper">
                                                        {example.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="url" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                                            <label htmlFor="check-url" className="sr-only">Article link</label>
                                            <div className="relative mt-5">
                                                <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lens" />
                                                <input id="check-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.example.com/news/story" className="field pl-11 font-mono text-sm" />
                                            </div>
                                            <p className="mt-3 text-xs text-faint">NewsLens fetches the page, extracts the article text and rates the outlet. Paywalled or script-only pages may need to be pasted as text.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" role="alert">
                                            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-fake/30 bg-fake/10 p-4 text-sm text-fake">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-5">
                                    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-faint">
                                        <li className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-real" /> NewsLens model</li>
                                        <li className="flex items-center gap-1.5"><Bot className={`h-3.5 w-3.5 ${services?.llm?.enabled ? 'text-real' : ''}`} /> AI fact-check {services?.llm?.enabled ? '' : '(off)'}</li>
                                        <li className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-real" /> Source rating</li>
                                        <li className="flex items-center gap-1.5"><BadgeCheck className={`h-3.5 w-3.5 ${services?.factCheck || services?.llm?.webSearch ? 'text-real' : ''}`} /> Published fact-checks {services?.factCheck || services?.llm?.webSearch ? '' : '(off)'}</li>
                                    </ul>
                                    <button type="submit" disabled={!canSubmit || phase === 'scanning'} className="btn-primary px-7 py-3">
                                        <ScanSearch className="h-4 w-4" /> Analyse
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <HistoryPanel items={history.items} available={history.available} />
        </div>
    );
}
