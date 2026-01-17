/**
 * AnalyzeForm.jsx - No GSAP, CSS Only
 */

import { useState } from 'react';

const AnalyzeForm = ({ onSubmit, isLoading }) => {
    const [mode, setMode] = useState('text');
    const [inputValue, setInputValue] = useState('');

    const handleModeChange = (newMode) => {
        setMode(newMode);
        setInputValue('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;
        onSubmit({ [mode]: inputValue.trim() });
    };

    const placeholders = {
        text: 'Paste news headline or article text here...',
        url: 'https://example.com/news-article'
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="cyber-card p-6 md:p-8 max-w-2xl mx-auto animate-fade-in"
        >
            {/* HUD Corners */}
            <div className="hud-corner hud-corner-tl" />
            <div className="hud-corner hud-corner-tr" />
            <div className="hud-corner hud-corner-bl" />
            <div className="hud-corner hud-corner-br" />

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
                <div className="relative inline-flex bg-cyber-darker rounded-sm p-1 border border-glow-cyan/30">
                    <button
                        type="button"
                        onClick={() => handleModeChange('text')}
                        className={`relative z-10 px-6 py-2 font-display text-sm tracking-wider transition-colors duration-300 ${mode === 'text' ? 'text-glow-cyan bg-glow-cyan/10' : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        TEXT
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange('url')}
                        className={`relative z-10 px-6 py-2 font-display text-sm tracking-wider transition-colors duration-300 ${mode === 'url' ? 'text-glow-cyan bg-glow-cyan/10' : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        URL
                    </button>
                </div>
            </div>

            {/* Input Area */}
            <div className="mb-6">
                <label className="block text-text-muted text-xs uppercase tracking-widest mb-2">
                    {mode === 'text' ? '📝 Paste text to check' : '🔗 Enter article URL'}
                </label>

                {mode === 'text' ? (
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholders.text}
                        className="cyber-input cyber-textarea"
                        disabled={isLoading}
                    />
                ) : (
                    <input
                        type="url"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholders.url}
                        className="cyber-input"
                        disabled={isLoading}
                    />
                )}
            </div>

            {/* Character Count */}
            {mode === 'text' && (
                <div className="flex justify-between text-xs text-text-muted mb-6">
                    <span>Min: 10 characters</span>
                    <span className={inputValue.length > 10000 ? 'text-glow-red' : ''}>
                        {inputValue.length.toLocaleString()} / 10,000
                    </span>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading || inputValue.trim().length < 10}
                className="cyber-button w-full text-lg transition-opacity duration-300 disabled:opacity-50"
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-pulse">◐</span>
                        PROCESSING...
                    </span>
                ) : (
                    <>
                        <span className="mr-2">🔍</span>
                        Analyze Now
                    </>
                )}
            </button>
        </form>
    );
};

export default AnalyzeForm;
