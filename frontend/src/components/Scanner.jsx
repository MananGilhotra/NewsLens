/**
 * Scanner.jsx - No GSAP, CSS Animations Only
 */

import { useState, useEffect } from 'react';

const Scanner = ({ isActive }) => {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Starting analysis...');
    const [visible, setVisible] = useState(false);

    const messages = [
        'Analyzing content...',
        'Checking sources...',
        'Detecting patterns...',
        'Computing score...',
        'Generating result...'
    ];

    useEffect(() => {
        if (!isActive) {
            setProgress(0);
            setVisible(false);
            return;
        }

        setVisible(true);
        setProgress(0);
        let messageIndex = 0;

        // Progress animation
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 2;
            });
        }, 100);

        // Message cycling
        const messageInterval = setInterval(() => {
            if (messageIndex < messages.length - 1) {
                messageIndex++;
                setMessage(messages[messageIndex]);
            }
        }, 1000);

        return () => {
            clearInterval(progressInterval);
            clearInterval(messageInterval);
        };
    }, [isActive]);

    if (!isActive && !visible) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-cyber-darker/95 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="relative w-full max-w-md mx-4 p-8 animate-fade-in">
                {/* HUD Corners */}
                <div className="hud-corner hud-corner-tl" />
                <div className="hud-corner hud-corner-tr" />
                <div className="hud-corner hud-corner-bl" />
                <div className="hud-corner hud-corner-br" />

                {/* Pulsing circle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 border-2 border-glow-cyan/30 rounded-full animate-pulse" />
                    <div className="absolute w-12 h-12 bg-glow-cyan/10 rounded-full" />
                </div>

                {/* Content */}
                <div className="text-center relative z-10">
                    <h2 className="font-display text-xl md:text-2xl text-glow-cyan mb-6">
                        {message}
                    </h2>

                    {/* Progress bar */}
                    <div className="relative mb-4">
                        <div className="h-2 bg-cyber-card border border-glow-cyan/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-glow-cyan rounded-full transition-all duration-100 ease-linear"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm font-mono">
                        <span className="text-glow-cyan/70">Processing</span>
                        <span className="text-glow-cyan font-bold">{Math.floor(progress)}%</span>
                    </div>

                    {/* Status indicators */}
                    <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-text-muted">
                        <div className="cyber-card p-2">
                            <div className="text-glow-cyan">◉ AI</div>
                            <div>Active</div>
                        </div>
                        <div className="cyber-card p-2">
                            <div className="text-glow-purple">◉ Model</div>
                            <div>Ready</div>
                        </div>
                        <div className="cyber-card p-2">
                            <div className="text-glow-green">◉ Status</div>
                            <div>Running</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Scanner;
