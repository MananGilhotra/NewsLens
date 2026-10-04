/**
 * Closing call-to-action and the footer with a full-width wordmark that rises letter by letter.
 */

import { useRef } from 'react';
import { ArrowRight, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import SplitReveal from '../ui/SplitReveal';
import MagneticButton from '../ui/MagneticButton';

const FOOTER_LINKS = [
    ['Product', [['#how-it-works', 'How it works'], ['#demo', 'Try it'], ['#features', 'Features']]],
    ['Model', [['#model', 'Model card'], ['#anatomy', 'Anatomy of a fake'], ['#faq', 'FAQ']]],
    ['Project', [['https://github.com/MananGilhotra/NewsLens', 'GitHub'], ['/signup', 'Create account'], ['/login', 'Log in']]]
];

function Wordmark() {
    const ref = useRef(null);
    useGSAP(() => {
        const mm = gsap.matchMedia();
        mm.add(MEDIA.motion, () => {
            gsap.from(ref.current.querySelectorAll('[data-letter]'), {
                yPercent: 100,
                duration: 1.4,
                stagger: 0.05,
                ease: 'expo.out',
                scrollTrigger: { trigger: ref.current, start: 'top 95%', once: true }
            });
        });
        return () => mm.revert();
    }, { scope: ref });

    return (
        <div ref={ref} aria-hidden="true" className="select-none overflow-hidden leading-[0.78]">
            <div className="flex justify-between font-display text-[19.5vw] font-light tracking-[-0.05em] text-paper">
                {'News'.split('').map((l, i) => <span key={`n${i}`} data-letter className="inline-block">{l}</span>)}
                {'Lens'.split('').map((l, i) => <span key={`l${i}`} data-letter className="inline-block italic text-lens">{l}</span>)}
            </div>
        </div>
    );
}

export default function FinalCta() {
    const lenis = useLenis();
    const toTop = () => (lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0, behavior: 'smooth' }));

    return (
        <>
            <section className="relative overflow-hidden border-t border-white/[0.06] bg-ink py-28 md:py-40">
                <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lens-deep/[0.07] blur-[150px]" />
                <div className="relative mx-auto max-w-[90rem] px-6 text-center md:px-12">
                    <SplitReveal className="mx-auto max-w-5xl font-display text-display-lg font-light text-paper">
                        Read the news. <em className="text-lens">Not the noise.</em>
                    </SplitReveal>
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-12 flex flex-col items-center gap-5"
                    >
                        <MagneticButton as="link" to="/signup" data-cursor="Join" className="conic-border btn rounded-full bg-ink-700 px-9 py-4 text-base text-paper hover:bg-ink-600">
                            Create a free account <ArrowRight className="h-4 w-4" />
                        </MagneticButton>
                        <p className="text-sm text-faint">Free · no install · works without any API keys</p>
                    </motion.div>
                </div>
            </section>

            <footer className="relative overflow-hidden border-t border-white/[0.06] bg-ink pt-20">
                <div className="mx-auto grid grid-cols-1 max-w-[90rem] gap-12 px-6 md:grid-cols-[1.2fr_2fr] md:px-12">
                    <div>
                        <p className="max-w-xs font-display text-2xl font-light leading-snug text-paper">
                            A lens for the news - built to make <em className="text-lens">trust</em> measurable.
                        </p>
                        <button type="button" onClick={toTop} className="btn-ghost mt-8 px-5 py-2.5 text-xs">
                            Back to top <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
                        {FOOTER_LINKS.map(([title, links]) => (
                            <div key={title}>
                                <p className="eyebrow mb-4">{title}</p>
                                <ul className="space-y-2.5">
                                    {links.map(([href, label]) => (
                                        <li key={label}>
                                            {href.startsWith('/')
                                                ? <Link to={href} className="link-underline text-sm text-muted transition-colors hover:text-paper">{label}</Link>
                                                : <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                                                    className="link-underline text-sm text-muted transition-colors hover:text-paper">{label}</a>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>
                <div className="mx-auto mt-16 flex max-w-[90rem] flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint md:px-12">
                    <span>© {new Date().getFullYear()} NewsLens</span>
                    <span>Scores are guidance, not a final ruling</span>
                </div>
                <div className="px-3 md:px-6"><Wordmark /></div>
            </footer>
        </>
    );
}
