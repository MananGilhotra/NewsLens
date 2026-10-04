import { Link } from 'react-router-dom';

export function LogoMark({ className = 'h-7 w-7' }) {
    return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
            <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="2" />
            <circle cx="14" cy="14" r="3.6" fill="currentColor" />
            <path d="M8.8 11.2a5.8 5.8 0 0 1 3.4-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
            <path d="M20.6 20.6 26.5 26.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
    );
}

export default function Logo({ to = '/', className = '' }) {
    return (
        <Link to={to} className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="NewsLens home">
            <LogoMark className="h-7 w-7 text-lens transition-transform duration-500 ease-out-expo group-hover:rotate-[-18deg] group-hover:scale-110" />
            <span className="text-[1.15rem] font-semibold tracking-tight text-paper">
                News<span className="font-display text-[1.3rem] font-normal italic text-lens">Lens</span>
            </span>
        </Link>
    );
}
