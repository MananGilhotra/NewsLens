/**
 * LandingPage - "See through the noise"
 */

import { useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import LandingNav from './landing/LandingNav';
import LensHero from './landing/LensHero';
import Manifesto from './landing/Manifesto';
import PipelineSection from './landing/PipelineSection';
import LiveDemo from './landing/LiveDemo';
import AnatomySection from './landing/AnatomySection';
import StatsSection from './landing/StatsSection';
import FeatureBento from './landing/FeatureBento';
import SourceMarquee from './landing/SourceMarquee';
import FaqSection from './landing/FaqSection';
import FinalCta from './landing/FinalCta';
import Preloader, { shouldShowPreloader } from './landing/Preloader';
import Cursor from './landing/Cursor';

function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
    return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-lens via-lens to-violet" style={{ scaleX }} />;
}

export default function LandingPage() {
    const [introDone, setIntroDone] = useState(() => !shouldShowPreloader());

    return (
        <div className="grain bg-ink">
            {!introDone && <Preloader onDone={() => setIntroDone(true)} />}
            <Cursor />
            <ScrollProgress />
            <LandingNav />
            <main>
                <LensHero ready={introDone} />
                <Manifesto />
                <PipelineSection />
                <LiveDemo />
                <AnatomySection />
                <StatsSection />
                <FeatureBento />
                <SourceMarquee />
                <FaqSection />
                <FinalCta />
            </main>
        </div>
    );
}
