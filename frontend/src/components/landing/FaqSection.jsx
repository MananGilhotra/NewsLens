/**
 * FAQ: honest answers, smooth accordion.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import SectionLabel from '../ui/SectionLabel';
import SplitReveal from '../ui/SplitReveal';

const ease = [0.16, 1, 0.3, 1];
const FAQ = [
    ['Can NewsLens tell me whether something is true?',
        'Not with certainty - no tool can. NewsLens combines four signals - how the text is written, an AI check of its concrete claims, the reputation of the outlet and published fact-checks - and shows you each one, so you can weigh the evidence instead of trusting a black box. When the evidence is thin, it says so.'],
    ['What is the NewsLens model trained on?',
        'More than 170,000 labelled articles and headlines: WELFake, FakeNewsNet (PolitiFact and GossipCop) and 28,000 articles from 730 reliable outlets in CC-News. Outlet watermarks were stripped and identity words are ignored, so it learns writing patterns - not shortcuts or prejudice.'],
    ['How accurate is it?',
        'About 95% on held-out news articles and 87% on headlines alone. It is weaker on short political claims and celebrity gossip - the full per-source breakdown is in the model card above, measured only on data the model never saw.'],
    ['Which news sources are rated?',
        '5,300+ outlets: a hand-curated list (including satire sites) plus the News Media Reliability dataset published at NAACL 2024, which aggregates professional reliability ratings.'],
    ['How does the deepfake check work?',
        'It reads the file’s hidden provenance - AI generator tags such as Stable Diffusion or Midjourney, IPTC “AI-generated” labels, C2PA Content Credentials and camera EXIF data. With AI enabled, a vision model also inspects faces, hands, lighting and text. Metadata can be stripped, so treat the result as evidence, not proof.'],
    ['Is it free? What happens to what I check?',
        'NewsLens is free. When you analyse something, the first part of the text and the verdict are stored so signed-in users can find their recent checks in their history.']
];

function Item({ question, answer, index, open, onToggle }) {
    return (
        <li className="border-b border-white/[0.07]">
            <button type="button" onClick={onToggle} aria-expanded={open} className="group flex w-full items-start gap-6 py-7 text-left">
                <span className="mt-2 font-mono text-xs text-faint">0{index + 1}</span>
                <span className={`flex-1 font-display text-2xl font-light transition-colors duration-300 md:text-3xl ${open ? 'text-paper' : 'text-paper/75 group-hover:text-paper'}`}>{question}</span>
                <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.4, ease }}
                    className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${open ? 'border-lens/50 text-lens' : 'border-white/10 text-muted group-hover:border-white/25'}`}>
                    <Plus className="h-4 w-4" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease }} className="overflow-hidden">
                        <p className="max-w-3xl pb-8 pl-10 text-pretty leading-relaxed text-muted md:pl-12">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
}

export default function FaqSection() {
    const [open, setOpen] = useState(0);
    return (
        <section id="faq" className="relative border-t border-white/[0.06] bg-ink py-28 md:py-36">
            <div className="mx-auto grid grid-cols-1 max-w-[90rem] gap-12 px-6 md:px-12 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                    <SectionLabel index={7}>Questions</SectionLabel>
                    <SplitReveal className="mt-10 font-display text-display-md font-light text-paper">
                        Fair <em className="text-lens">questions.</em>
                    </SplitReveal>
                    <p className="mt-6 max-w-sm leading-relaxed text-muted">Straight answers about what NewsLens can and can’t do.</p>
                </div>
                <ul className="border-t border-white/[0.07]">
                    {FAQ.map(([question, answer], i) => (
                        <Item key={question} question={question} answer={answer} index={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
                    ))}
                </ul>
            </div>
        </section>
    );
}
