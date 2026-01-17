/**
 * HudOverlay.jsx - No GSAP, Static Background HUD
 */

import { useMemo } from 'react';

const HudOverlay = () => {
    const hexValues = useMemo(() =>
        [...Array(12)].map(() => Math.random().toString(16).substring(2, 10).toUpperCase()),
        []
    );

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Top Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-cyber-darker via-cyber-dark to-cyber-darker border-b border-glow-cyan/20">
                <div className="flex items-center justify-between h-full px-4 text-xs font-mono">
                    <div className="flex items-center gap-4 text-glow-cyan/60">
                        <span>◉ SYSTEM: ONLINE</span>
                        <span className="text-glow-green/60">◉ AI: ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-4 text-text-muted">
                        <span>LAT: 00.0000</span>
                        <span>LONG: 00.0000</span>
                        <span className="text-glow-cyan/60">{new Date().toISOString().split('T')[0]}</span>
                    </div>
                </div>
            </div>

            {/* Left Data Panel */}
            <div className="absolute left-4 top-16 bottom-16 w-24 overflow-hidden opacity-20">
                <div className="text-xs font-mono text-glow-cyan/50 space-y-1">
                    {hexValues.map((hex, i) => (
                        <div key={i} className="opacity-70">
                            <span>0x{hex}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Data Panel */}
            <div className="absolute right-4 top-16 w-32 overflow-hidden opacity-20">
                <div className="text-xs font-mono text-right space-y-2">
                    <div className="text-glow-purple/50">MEM: 64%</div>
                    <div className="text-glow-cyan/50">CPU: 45%</div>
                    <div className="text-glow-green/50">NET: STABLE</div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-cyber-darker via-cyber-dark to-cyber-darker border-t border-glow-cyan/20">
                <div className="flex items-center justify-center h-full text-xs font-mono text-text-muted">
                    <span className="mr-4">●</span>
                    VERITYAI v1.0.0 | NEURAL ENGINE |
                    <span className="text-glow-cyan ml-2">GEMINI CORE</span>
                </div>
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-12 left-2 w-6 h-6 border-l-2 border-t-2 border-glow-cyan/20" />
            <div className="absolute top-12 right-2 w-6 h-6 border-r-2 border-t-2 border-glow-cyan/20" />
            <div className="absolute bottom-8 left-2 w-6 h-6 border-l-2 border-b-2 border-glow-cyan/20" />
            <div className="absolute bottom-8 right-2 w-6 h-6 border-r-2 border-b-2 border-glow-cyan/20" />
        </div>
    );
};

export default HudOverlay;
