/**
 * Anatomy of misinformation: five manipulation techniques on a horizontally scrolling track.
 * Desktop with motion: pinned, scroll drives the track sideways. Otherwise: swipeable row.
 */

import { useRef } from 'react';
import { gsap, useGSAP, MEDIA } from '../../lib/gsap';
import SectionLabel from '../ui/SectionLabel';
import SplitReveal from '../ui/SplitReveal';

const TECHNIQUES = [
    {
        title: 'Emotional hooks',
        text: 'Outrage and fear travel faster than facts. Capitals, “shocking” and walls of exclamation marks are among the strongest fake signals our model learned.',
        example: [['', ''], ['SHOCKING!!!', 'cue'], [' You won’t ', ''], ['BELIEVE', 'cue'], [' what they found in the water', '']],
        check: 'Model cue'
    },
    {
        title: 'Missing attribution',
        text: 'Credible reporting says who said what, and when - “officials said on Tuesday”. Fabrications lean on vague sources that can’t be checked.',
        example: [['', ''], ['Insiders claim', 'cue'], [' the cure was hidden for years, ', ''], ['people are saying', 'cue']],
        check: 'Model + AI check'
    },
    {
        title: 'Borrowed authority',
        text: 'Invented experts, misquoted studies and fake institutions dress fiction up as science. The AI fact-check tests whether the authority exists at all.',
        example: [['A ', ''], ['“top scientist”', 'cue'], [' confirms what ', ''], ['the experts', 'cue'], [' won’t admit', '']],
        check: 'AI fact-check'
    },
    {
        title: 'Manufactured urgency',
        text: 'Pressure to share before you think is one of the clearest manipulation tells. Real news rarely begs to be forwarded.',
        example: [['', ''], ['Share this before it’s deleted', 'cue'], [' - forward to everyone you know ', ''], ['NOW', 'cue']],
        check: 'Model cue'
    },
    {
        title: 'Manufactured media',
        text: 'A generated image gives a false story a face. NewsLens reads the file’s hidden provenance - generator tags, Content Credentials, camera data.',
        example: [['parameters: ', ''], ['Steps: 30, Sampler: DPM++', 'cue'], [' · EXIF: ', ''], ['none', 'cue']],
        check: 'Media forensics'
    }
];

export default function AnatomySection() {
    const root = useRef(null);
    const track = useRef(null);

    useGSAP(() => {
        const mm = gsap.matchMedia();
        mm.add(`${MEDIA.desktop} and ${MEDIA.motion}`, () => {
            const distance = () => track.current.scrollWidth - window.innerWidth + 96;
            const tween = gsap.to(track.current, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: root.current,
                    start: 'top top',
                    end: () => `+=${distance()}`,
                    scrub: 0.8,
                    pin: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true
                }
            });
            gsap.utils.toArray(track.current.querySelectorAll('[data-card]')).forEach((card) => {
                gsap.from(card.querySelectorAll('[data-cue]'), {
                    backgroundColor: 'rgba(251,113,133,0)',
                    color: '#F2EFE8',
                    duration: 0.6,
                    stagger: 0.15,
                    scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 70%', toggleActions: 'play none none reverse' }
                });
            });
        });
        return () => mm.revert();
    }, { scope: root });

    return (
        <section ref={root} id="anatomy" className="relative overflow-hidden border-t border-white/[0.06] bg-ink py-24 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:py-0">
            <div className="mx-auto w-full max-w-[90rem] px-6 md:px-12">
                <SectionLabel index={4} aside="Scroll →">Anatomy of a fake</SectionLabel>
                <SplitReveal className="mt-10 max-w-4xl font-display text-display-md font-light text-paper">
                    Five tricks misinformation <em className="text-lens">always</em> plays.
                </SplitReveal>
            </div>
            <div className="mt-12 overflow-x-auto scrollbar-none lg:overflow-visible" data-lenis-prevent-wheel>
                <div ref={track} className="flex w-max snap-x snap-mandatory gap-5 px-6 md:px-12 lg:snap-none">
                    {TECHNIQUES.map((t, i) => (
                        <article key={t.title} data-card className="card edge-lit flex w-[82vw] shrink-0 snap-start flex-col p-7 sm:w-[26rem] md:p-9 lg:w-[34rem]">
                            <div className="flex items-start justify-between">
                                <span className="text-outline font-display text-[5.5rem] font-light leading-none md:text-[7rem]">0{i + 1}</span>
                                <span className="chip mt-3 border-lens/25 text-lens">{t.check}</span>
                            </div>
                            <h3 className="mt-8 font-display text-3xl font-light text-paper md:text-4xl">{t.title}</h3>
                            <p className="mt-4 text-pretty leading-relaxed text-muted">{t.text}</p>
                            <blockquote className="mt-auto pt-8">
                                <div className="rounded-2xl border border-white/[0.06] bg-ink/60 p-4 font-display text-lg leading-relaxed text-paper/80">
                                    “{t.example.map(([part, kind], j) => (kind === 'cue'
                                        ? <span key={j} data-cue className="rounded bg-fake/15 px-1 text-fake">{part}</span>
                                        : <span key={j}>{part}</span>))}”
                                </div>
                            </blockquote>
                        </article>
                    ))}
                    <div className="flex w-[60vw] shrink-0 items-center sm:w-[22rem] lg:w-[28rem]" aria-hidden="true">
                        <p className="font-display text-3xl font-light italic leading-snug text-faint md:text-4xl">
                            NewsLens checks for all five - and shows you which ones it found.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
