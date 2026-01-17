/**
 * LandingPage - Enhanced Premium Design
 */

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function LandingPage() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Animated counter hook
    const useCounter = (end, duration = 2000) => {
        const [count, setCount] = useState(0);
        useEffect(() => {
            if (!isVisible) return;
            let startTime = null;
            const animate = (currentTime) => {
                if (!startTime) startTime = currentTime;
                const progress = Math.min((currentTime - startTime) / duration, 1);
                setCount(Math.floor(progress * end));
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }, [end, duration, isVisible]);
        return count;
    };

    const stats = [
        { value: useCounter(50000), suffix: '+', label: 'News Verified' },
        { value: useCounter(99), suffix: '%', label: 'Accuracy Rate' },
        { value: useCounter(10000), suffix: '+', label: 'Users Trust Us' },
        { value: useCounter(24), suffix: '/7', label: 'Live Monitoring' }
    ];

    const howItWorks = [
        { step: '01', title: 'Browse News', desc: 'Access our curated feed of real-time news from verified sources worldwide.', icon: '📡' },
        { step: '02', title: 'AI Analysis', desc: 'Our neural networks instantly analyze content for authenticity and bias.', icon: '🧠' },
        { step: '03', title: 'Get Scores', desc: 'See trust scores, source reliability, and detailed verification reports.', icon: '✓' }
    ];

    const features = [
        { icon: '📡', title: 'Live News Feed', desc: 'Real-time curated news with AI-verified reliability scores for every article.', color: 'green', gradient: 'from-green-500/20 to-transparent' },
        { icon: '📰', title: 'Fact Checker', desc: 'Paste any headline or article to instantly verify its authenticity.', color: 'cyan', gradient: 'from-cyan-500/20 to-transparent' },
        { icon: '🎭', title: 'Deepfake Scanner', desc: 'Detect AI-generated or manipulated images and videos with precision.', color: 'purple', gradient: 'from-purple-500/20 to-transparent' },
        { icon: '⭐', title: 'Source Intel', desc: 'Comprehensive reliability ratings for news sources based on track record.', color: 'yellow', gradient: 'from-yellow-500/20 to-transparent' }
    ];

    return (
        <div className="min-h-screen bg-cyber-darker relative overflow-hidden">
            <div className="data-stream" />

            {/* Enhanced Floating Particles */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-float"
                        style={{
                            left: `${5 + i * 6}%`,
                            top: `${10 + (i % 5) * 18}%`,
                            width: `${4 + (i % 3) * 2}px`,
                            height: `${4 + (i % 3) * 2}px`,
                            background: i % 3 === 0 ? 'var(--glow-cyan)' : i % 3 === 1 ? 'var(--glow-purple)' : 'var(--glow-green)',
                            opacity: 0.3 + (i % 3) * 0.1,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: `${3 + (i % 3)}s`
                        }}
                    />
                ))}
            </div>

            {/* Multiple Gradient Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-glow-purple/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow-cyan/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-glow-green/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Navigation */}
                <nav className="flex justify-between items-center px-6 md:px-12 py-6 animate-fade-in">
                    <div className="font-display text-2xl font-bold cursor-pointer group">
                        <span className="text-gradient-cyan group-hover:opacity-80 transition-opacity">NEWS</span>
                        <span className="text-white">LENS</span>
                        <div className="h-0.5 w-0 group-hover:w-full bg-glow-cyan transition-all duration-300" />
                    </div>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 font-display text-sm tracking-wider text-text-secondary hover:text-glow-cyan transition-colors duration-300"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="relative px-6 py-2 font-display text-sm tracking-wider border border-glow-cyan text-glow-cyan hover:bg-glow-cyan hover:text-cyber-darker transition-all duration-300 overflow-hidden group"
                        >
                            <span className="relative z-10">Sign Up</span>
                            <div className="absolute inset-0 bg-glow-cyan transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                        </button>
                    </div>
                </nav>

                {/* Hero Section */}
                <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-12">
                    {/* Badge */}
                    <div className="mb-8 animate-slide-up">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-glow-green/30 bg-glow-green/5 text-glow-green text-xs font-display tracking-wider">
                            <span className="w-2 h-2 bg-glow-green rounded-full animate-pulse" />
                            AI-POWERED VERIFICATION
                        </span>
                    </div>

                    <div className="mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-wider mb-4">
                            <span className="text-gradient-cyan">STAY</span>
                            <br />
                            <span className="text-white relative">
                                INFORMED
                                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-glow-cyan to-transparent" />
                            </span>
                        </h1>
                    </div>

                    <p className="font-mono text-text-secondary text-lg md:text-xl max-w-2xl mb-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
                        Your <span className="text-glow-green font-semibold">trusted news feed</span> with AI-powered
                        <span className="text-glow-cyan"> fact-checking</span>,
                        <span className="text-glow-purple"> deepfake detection</span>, and source reliability scores.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <button
                            onClick={() => navigate('/signup')}
                            className="group relative px-10 py-4 font-display text-lg tracking-wider bg-gradient-to-r from-glow-cyan to-glow-green text-cyber-darker font-bold overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-glow-cyan/30 hover:scale-105"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Get Started Free
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-10 py-4 font-display text-lg tracking-wider border-2 border-glow-purple text-glow-purple hover:bg-glow-purple/10 transition-all duration-300 hover:scale-105"
                        >
                            I Have an Account
                        </button>
                    </div>
                </main>

                {/* Stats Section */}
                <section className="py-12 px-6 md:px-12 border-y border-cyber-border/30">
                    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center group">
                                <div className="font-display text-4xl md:text-5xl font-black text-gradient-cyan mb-2 group-hover:scale-110 transition-transform">
                                    {stat.value.toLocaleString()}{stat.suffix}
                                </div>
                                <div className="text-text-muted text-sm font-mono tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-20 px-6 md:px-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                                How <span className="text-gradient-cyan">NewsLens</span> Works
                            </h2>
                            <p className="text-text-muted max-w-xl mx-auto">
                                Get verified news in three simple steps
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {howItWorks.map((item, i) => (
                                <div key={i} className="relative group">
                                    {/* Connector Line */}
                                    {i < 2 && (
                                        <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-glow-cyan/50 to-transparent z-0" />
                                    )}
                                    <div className="cyber-card p-8 relative z-10 hover:border-glow-cyan/50 transition-all duration-300 h-full">
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-4xl">{item.icon}</span>
                                            <span className="font-display text-5xl font-black text-cyber-border/30 group-hover:text-glow-cyan/30 transition-colors">
                                                {item.step}
                                            </span>
                                        </div>
                                        <h3 className="font-display text-xl text-white mb-3">{item.title}</h3>
                                        <p className="text-text-muted text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 px-6 md:px-12 bg-gradient-to-b from-transparent via-cyber-border/5 to-transparent">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                                Powerful <span className="text-gradient-cyan">Features</span>
                            </h2>
                            <p className="text-text-muted max-w-xl mx-auto">
                                Everything you need to combat misinformation
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {features.map((feature, i) => (
                                <div
                                    key={i}
                                    className="group cyber-card p-6 hover:scale-105 transition-all duration-300 relative overflow-hidden"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    {/* Gradient overlay on hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-b ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="relative z-10">
                                        <div className={`text-5xl mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                            {feature.icon}
                                        </div>
                                        <h3 className="font-display text-lg text-white mb-2 group-hover:text-glow-cyan transition-colors">
                                            {feature.title}
                                        </h3>
                                        <p className="text-text-muted text-sm leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Trust Badges */}
                <section className="py-16 px-6 md:px-12">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="text-text-muted text-sm mb-6 font-mono">TRUSTED BY JOURNALISTS & RESEARCHERS</p>
                        <div className="flex flex-wrap justify-center gap-8 opacity-50">
                            {['🏛️ Universities', '📺 Media Houses', '🔬 Research Labs', '🌐 NGOs'].map((badge, i) => (
                                <span key={i} className="text-text-secondary font-display tracking-wider">{badge}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 px-6 md:px-12">
                    <div className="max-w-4xl mx-auto text-center cyber-card p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-glow-purple/10 via-glow-cyan/10 to-glow-green/10" />
                        <div className="relative z-10">
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                                Ready to <span className="text-gradient-cyan">Stay Informed</span>?
                            </h2>
                            <p className="text-text-muted mb-8 max-w-lg mx-auto">
                                Join thousands of users who trust NewsLens for verified, reliable news.
                            </p>
                            <button
                                onClick={() => navigate('/signup')}
                                className="px-12 py-4 font-display text-lg tracking-wider bg-glow-cyan text-cyber-darker font-bold hover:shadow-xl hover:shadow-glow-cyan/30 transition-all duration-300 hover:scale-105"
                            >
                                Start Free Today
                            </button>
                        </div>
                    </div>
                </section>

                <footer className="text-center py-8 px-4 border-t border-cyber-border/30">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="font-display text-lg">
                            <span className="text-gradient-cyan">NEWS</span>
                            <span className="text-white">LENS</span>
                        </div>
                        <p className="text-text-muted text-xs">© 2026 NewsLens. All rights reserved.</p>
                        <div className="flex gap-6 text-text-muted text-sm">
                            <a href="#" className="hover:text-glow-cyan transition-colors">Privacy</a>
                            <a href="#" className="hover:text-glow-cyan transition-colors">Terms</a>
                            <a href="#" className="hover:text-glow-cyan transition-colors">Contact</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default LandingPage;
