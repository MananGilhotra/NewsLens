/**
 * Verdict / trust helpers - one mapping from scores to colours and labels for the whole UI.
 * Tailwind needs literal class names, so every tone lists its full classes.
 */

import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

export const TONES = {
    real: {
        key: 'real',
        hex: '#34D399',
        text: 'text-real',
        bg: 'bg-real',
        soft: 'bg-real/10',
        border: 'border-real/30',
        ring: 'ring-real/30',
        glow: 'shadow-[0_0_60px_-12px_rgba(52,211,153,0.55)]',
        Icon: ShieldCheck,
    },
    fake: {
        key: 'fake',
        hex: '#FB7185',
        text: 'text-fake',
        bg: 'bg-fake',
        soft: 'bg-fake/10',
        border: 'border-fake/30',
        ring: 'ring-fake/30',
        glow: 'shadow-[0_0_60px_-12px_rgba(251,113,133,0.55)]',
        Icon: ShieldAlert,
    },
    unsure: {
        key: 'unsure',
        hex: '#FBBF24',
        text: 'text-unsure',
        bg: 'bg-unsure',
        soft: 'bg-unsure/10',
        border: 'border-unsure/30',
        ring: 'ring-unsure/30',
        glow: 'shadow-[0_0_60px_-12px_rgba(251,191,36,0.5)]',
        Icon: ShieldQuestion,
    },
};

export const toneForScore = (score, { high = 60, low = 40 } = {}) =>
    score >= high ? TONES.real : score <= low ? TONES.fake : TONES.unsure;

export const toneForVerdict = (verdict) => {
    if (/real/i.test(verdict)) return TONES.real;
    if (/fake/i.test(verdict)) return TONES.fake;
    return TONES.unsure;
};

export const VERDICT_COPY = {
    Real: { title: 'Looks credible', sub: 'The evidence points to genuine, well-sourced reporting.' },
    Fake: { title: 'Likely misinformation', sub: 'Multiple signals match fabricated or manipulated content.' },
    Inconclusive: { title: 'Treat with caution', sub: 'The signals are mixed - verify with other sources before sharing.' },
};

export const TIER_COPY = {
    VERIFIED: { label: 'Verified', tone: TONES.real },
    MODERATE: { label: 'Moderate', tone: TONES.unsure },
    CAUTION: { label: 'Caution', tone: TONES.fake },
};

export function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
