/**
 * ResultDisplay.jsx - Animated Result Reveal Component (CSS Only)
 * 
 * Features:
 * - Score count-up animation (Pure JS)
 * - FAKE verdict: red flash + WARNING styling
 * - REAL verdict: green glow sweep
 * - INCONCLUSIVE: yellow pulsing
 */

import { useEffect, useRef, useState } from 'react';

const ResultDisplay = ({ result, onReset }) => {
    const [displayScore, setDisplayScore] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [showFlash, setShowFlash] = useState(false);

    const { score, verdict, reasoning } = result;

    // Determine colors based on verdict
    const getVerdictConfig = () => {
        switch (verdict) {
            case 'Fake':
                return {
                    color: 'text-glow-red',
                    glow: 'glow-text-red',
                    border: 'glow-border-red',
                    bg: 'bg-red-500/10',
                    icon: '⚠',
                    label: 'WARNING: FAKE NEWS DETECTED'
                };
            case 'Real':
                return {
                    color: 'text-glow-green',
                    glow: 'glow-text-green',
                    border: 'glow-border-green',
                    bg: 'bg-green-500/10',
                    icon: '✓',
                    label: 'VERIFIED: CONTENT APPEARS AUTHENTIC'
                };
            default:
                return {
                    color: 'text-glow-yellow',
                    glow: 'glow-text-yellow',
                    border: 'border-glow-yellow',
                    bg: 'bg-yellow-500/10',
                    icon: '?',
                    label: 'CAUTION: VERIFICATION INCONCLUSIVE'
                };
        }
    };

    const config = getVerdictConfig();

    useEffect(() => {
        // Trigger entrance animation
        const entranceTimer = setTimeout(() => {
            setIsVisible(true);
        }, 50);

        // Score count-up animation using requestAnimationFrame
        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        let animationFrame;

        const animateScore = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out function
            const easeOut = 1 - Math.pow(1 - progress, 2);
            const currentScore = Math.round(score * easeOut);

            setDisplayScore(currentScore);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animateScore);
            }
        };

        // Start score animation after a small delay
        const scoreTimer = setTimeout(() => {
            animateScore();
        }, 300);

        // Flash effect for FAKE verdict
        if (verdict === 'Fake') {
            const flashTimer = setTimeout(() => {
                setShowFlash(true);
                setTimeout(() => setShowFlash(false), 500);
            }, 500);
            return () => {
                clearTimeout(entranceTimer);
                clearTimeout(scoreTimer);
                clearTimeout(flashTimer);
                cancelAnimationFrame(animationFrame);
            };
        }

        return () => {
            clearTimeout(entranceTimer);
            clearTimeout(scoreTimer);
            cancelAnimationFrame(animationFrame);
        };
    }, [score, verdict]);

    return (
        <>
            {/* Flash overlay for FAKE */}
            {verdict === 'Fake' && (
                <div
                    className={`fixed inset-0 pointer-events-none z-40 transition-opacity duration-100 ${showFlash ? 'bg-red-600/30' : 'bg-red-600/0'
                        }`}
                />
            )}

            <div
                className={`cyber-card p-8 max-w-2xl mx-auto ${config.bg} transition-all duration-500 ${isVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-12'
                    } ${verdict === 'Real' && isVisible
                        ? 'shadow-[0_0_60px_rgba(0,255,136,0.5),0_0_100px_rgba(0,255,136,0.3)]'
                        : ''
                    }`}
            >
                {/* HUD Corners */}
                <div className="hud-corner hud-corner-tl" />
                <div className="hud-corner hud-corner-tr" />
                <div className="hud-corner hud-corner-bl" />
                <div className="hud-corner hud-corner-br" />

                {/* Score Display */}
                <div className={`text-center mb-8 transition-all duration-500 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                    <div className="text-text-muted text-sm uppercase tracking-widest mb-2">
                        Truth Score
                    </div>
                    <div
                        className={`font-display text-8xl md:text-9xl font-black ${config.glow}`}
                        style={{
                            textShadow: verdict === 'Fake'
                                ? '0 0 30px rgba(255, 0, 68, 0.8), 0 0 60px rgba(255, 0, 68, 0.5)'
                                : verdict === 'Real'
                                    ? '0 0 30px rgba(0, 255, 136, 0.8), 0 0 60px rgba(0, 255, 136, 0.5)'
                                    : '0 0 30px rgba(255, 204, 0, 0.8), 0 0 60px rgba(255, 204, 0, 0.5)'
                        }}
                    >
                        {displayScore}
                    </div>
                    <div className="text-text-muted text-sm">/100</div>
                </div>

                {/* Verdict Banner */}
                <div
                    className={`text-center py-4 mb-6 border-t border-b ${config.border} ${config.bg} transition-all duration-500 delay-200 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                        }`}
                >
                    <div
                        className={`font-display text-xl md:text-2xl ${config.glow} tracking-wider ${verdict === 'Fake' ? 'animate-pulse' : ''
                            }`}
                    >
                        <span className="mr-2">{config.icon}</span>
                        {config.label}
                    </div>
                </div>

                {/* Reasoning */}
                <div className={`mb-8 transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                    <div className="text-text-muted text-xs uppercase tracking-widest mb-3">
                        AI Analysis
                    </div>
                    <div className="cyber-card p-4 text-text-secondary leading-relaxed">
                        <span className="text-glow-cyan mr-2">▸</span>
                        {reasoning}
                    </div>
                </div>

                {/* Verdict Details Grid */}
                <div className={`grid grid-cols-3 gap-4 mb-8 text-center text-xs transition-all duration-500 delay-[400ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                    <div className="cyber-card p-3">
                        <div className="text-text-muted mb-1">VERDICT</div>
                        <div className={`font-display ${config.color} text-lg`}>
                            {verdict.toUpperCase()}
                        </div>
                    </div>
                    <div className="cyber-card p-3">
                        <div className="text-text-muted mb-1">CONFIDENCE</div>
                        <div className="font-display text-glow-cyan text-lg">
                            {score > 80 || score < 20 ? 'HIGH' : score > 60 || score < 40 ? 'MEDIUM' : 'LOW'}
                        </div>
                    </div>
                    <div className="cyber-card p-3">
                        <div className="text-text-muted mb-1">ENGINE</div>
                        <div className="font-display text-glow-purple text-lg">
                            GEMINI
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className={`text-center transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                    <button
                        onClick={onReset}
                        className="cyber-button text-sm"
                    >
                        ◄ ANALYZE ANOTHER
                    </button>
                </div>
            </div>
        </>
    );
};

export default ResultDisplay;
