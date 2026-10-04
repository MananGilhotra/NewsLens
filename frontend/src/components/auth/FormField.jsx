/**
 * Floating-label input with optional show/hide toggle and inline error.
 */

import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export default function FormField({ label, type = 'text', error, hint, ...props }) {
    const id = useId();
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';

    return (
        <div>
            <div className="relative">
                <input
                    id={id}
                    type={isPassword && visible ? 'text' : type}
                    placeholder=" "
                    aria-invalid={Boolean(error)}
                    aria-describedby={error || hint ? `${id}-note` : undefined}
                    className={`field peer pb-2.5 pt-6 ${isPassword ? 'pr-12' : ''} ${error ? 'border-fake/60 focus:border-fake/70' : ''}`}
                    {...props}
                />
                <label
                    htmlFor={id}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.95rem] text-faint transition-all duration-200 ease-out-expo peer-focus:top-3.5 peer-focus:text-[0.7rem] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-lens peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[0.7rem] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider"
                >
                    {label}
                </label>
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover:text-paper"
                        aria-label={visible ? 'Hide password' : 'Show password'}
                    >
                        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
            <AnimatePresence initial={false}>
                {(error || hint) && (
                    <motion.p
                        id={`${id}-note`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`overflow-hidden pl-1 pt-1.5 text-xs ${error ? 'text-fake' : 'text-faint'}`}
                    >
                        {error || hint}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
