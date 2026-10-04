/**
 * Minimal toast system: useToast()(message, { tone: 'success' | 'error' | 'info' }).
 */

import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(() => {});
const ICONS = {
    success: [CheckCircle2, 'text-real'],
    error: [AlertTriangle, 'text-fake'],
    info: [Info, 'text-lens']
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const push = useCallback((message, { tone = 'info', duration = 3200 } = {}) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts((list) => [...list.slice(-2), { id, message, tone }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), duration);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            {createPortal(
                <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[85] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
                    <AnimatePresence initial={false}>
                        {toasts.map((toast) => {
                            const [Icon, color] = ICONS[toast.tone] || ICONS.info;
                            return (
                                <motion.div
                                    key={toast.id}
                                    layout
                                    initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.2 } }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    className="glass pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2.5 pl-3.5 pr-5 text-sm text-paper shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
                                    role="status"
                                >
                                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                                    {toast.message}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
