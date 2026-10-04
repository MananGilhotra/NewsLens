/**
 * Endless ribbons of rated outlets - reliable ones drift left, the rest drift right.
 */

const RELIABLE = ['Reuters', 'Associated Press', 'BBC News', 'The Guardian', 'NPR', 'The Hindu', 'Financial Times', 'Deutsche Welle', 'Al Jazeera', 'The Economist', 'ProPublica', 'Nature', 'France 24', 'Bloomberg'];
const FLAGGED = [['InfoWars', 'fake'], ['The Onion', 'satire'], ['Natural News', 'fake'], ['Daily Star', 'unsure'], ['World News Daily Report', 'fake'], ['The Babylon Bee', 'satire'], ['Zero Hedge', 'unsure'], ['Before It’s News', 'fake'], ['Daily Mail', 'unsure'], ['Empire News', 'fake']];

const DOT = { real: 'bg-real', fake: 'bg-fake', unsure: 'bg-unsure', satire: 'bg-violet' };

function Ribbon({ items, reverse, duration }) {
    return (
        <div className="flex overflow-hidden mask-fade-x" aria-hidden="true">
            <div className={`flex w-max shrink-0 gap-12 pr-12 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} hover:[animation-play-state:paused]`} style={{ '--marquee-duration': duration }}>
                {[...items, ...items].map(([name, tone], i) => (
                    <span key={`${name}-${i}`} className="flex items-center gap-3 whitespace-nowrap font-display text-3xl font-light italic text-paper/80 md:text-5xl">
                        <span className={`h-2 w-2 rounded-full not-italic ${DOT[tone]}`} />
                        {name}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function SourceMarquee() {
    return (
        <section className="relative border-t border-white/[0.06] bg-ink py-20" aria-labelledby="sources-title">
            <div className="mx-auto mb-10 flex max-w-[90rem] flex-col justify-between gap-4 px-6 md:flex-row md:items-end md:px-12">
                <h2 id="sources-title" className="eyebrow">5,300+ outlets rated for reliability</h2>
                <div className="flex flex-wrap gap-4 font-mono text-[0.65rem] uppercase tracking-wider text-faint">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-real" /> Reliable</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-unsure" /> Mixed / tabloid</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-fake" /> Unreliable</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet" /> Satire</span>
                </div>
            </div>
            <div className="space-y-6">
                <Ribbon items={RELIABLE.map((n) => [n, 'real'])} duration="55s" />
                <Ribbon items={FLAGGED} reverse duration="48s" />
            </div>
        </section>
    );
}
