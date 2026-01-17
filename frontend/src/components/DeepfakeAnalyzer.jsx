/**
 * DeepfakeAnalyzer - No GSAP, CSS Only
 */

import { useState } from 'react';

function DeepfakeAnalyzer() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];

        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload an image (JPG, PNG, GIF) or video (MP4, WebM)');
            return;
        }

        if (selectedFile.size > 50 * 1024 * 1024) {
            setError('File size must be less than 50MB');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selectedFile);
    };

    const analyzeMedia = async () => {
        if (!file) return;

        setAnalyzing(true);
        setError(null);

        try {
            const base64 = preview.split(',')[1];
            const isVideo = file.type.startsWith('video/');

            const response = await fetch('/api/analyze/deepfake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    media: base64,
                    mediaType: file.type,
                    fileName: file.name,
                    isVideo
                })
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (err) {
            console.error('Deepfake analysis error:', err);
            setError(err.message || 'Failed to analyze media');
        } finally {
            setAnalyzing(false);
        }
    };

    const resetAnalysis = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
    };

    const getResultColor = () => {
        if (!result) return 'glow-cyan';
        if (result.score >= 70) return 'glow-green';
        if (result.score >= 40) return 'glow-yellow';
        return 'glow-red';
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="font-display text-2xl md:text-3xl text-white mb-2">
                    Deepfake <span className="text-glow-purple">Detector</span>
                </h2>
                <p className="text-text-muted text-sm">
                    Upload a photo or video to check if it's AI-generated or manipulated
                </p>
            </div>

            {/* Upload Area */}
            <div
                className={`cyber-card p-8 transition-all duration-300 ${dragActive ? 'border-glow-purple bg-glow-purple/10' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {!file ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📷</div>
                        <p className="text-text-secondary mb-4">
                            Drag & drop your image or video here
                        </p>
                        <p className="text-text-muted text-sm mb-6">or</p>
                        <label className="cyber-button cursor-pointer">
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,video/mp4,video/webm"
                                onChange={handleFileInput}
                            />
                            Browse Files
                        </label>
                        <p className="text-text-muted text-xs mt-4">
                            Supports: JPG, PNG, GIF, MP4, WebM (max 50MB)
                        </p>
                    </div>
                ) : (
                    <div>
                        {/* Preview */}
                        <div className="relative mb-6">
                            {file.type.startsWith('video/') ? (
                                <video src={preview} className="w-full max-h-80 object-contain rounded" controls />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full max-h-80 object-contain rounded" />
                            )}
                            <button
                                onClick={resetAnalysis}
                                className="absolute top-2 right-2 w-8 h-8 bg-cyber-darker/80 text-glow-red rounded-full hover:bg-glow-red/20 transition-colors duration-300"
                            >
                                ✕
                            </button>
                        </div>

                        {/* File Info */}
                        <div className="flex items-center justify-between mb-6 text-sm">
                            <span className="text-text-secondary truncate max-w-xs">{file.name}</span>
                            <span className="text-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>

                        {/* Analyze Button */}
                        {!result && (
                            <button
                                onClick={analyzeMedia}
                                disabled={analyzing}
                                className="w-full cyber-button disabled:opacity-50 transition-opacity duration-300"
                            >
                                {analyzing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin">◐</span> Analyzing...
                                    </span>
                                ) : (
                                    '🔍 Check for Deepfake'
                                )}
                            </button>
                        )}

                        {/* Results */}
                        {result && (
                            <div className={`cyber-card p-6 animate-fade-in`}>
                                <div className="text-center mb-4">
                                    <div className={`text-6xl font-display font-bold text-${getResultColor()}`}>
                                        {result.score}%
                                    </div>
                                    <div className={`text-lg font-display text-${getResultColor()} mt-2`}>
                                        {result.verdict}
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Confidence</span>
                                        <span className="text-text-secondary">{result.confidence}</span>
                                    </div>
                                    <div className="border-t border-cyber-border pt-3">
                                        <p className="text-text-secondary">{result.analysis}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={resetAnalysis}
                                    className="w-full mt-6 py-3 border border-cyber-border text-text-muted hover:text-glow-cyan hover:border-glow-cyan transition-colors duration-300 font-display text-sm"
                                >
                                    ↻ Check Another
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mt-4 p-4 border border-glow-red bg-glow-red/10 text-glow-red text-sm animate-fade-in">
                        ⚠ {error}
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
                <div className="cyber-card p-4">
                    <div className="text-glow-green text-2xl mb-2">✓</div>
                    <div className="text-text-secondary">Real Content</div>
                    <div className="text-text-muted text-xs mt-1">70-100% authenticity</div>
                </div>
                <div className="cyber-card p-4">
                    <div className="text-glow-yellow text-2xl mb-2">?</div>
                    <div className="text-text-secondary">Uncertain</div>
                    <div className="text-text-muted text-xs mt-1">40-69% - needs review</div>
                </div>
                <div className="cyber-card p-4">
                    <div className="text-glow-red text-2xl mb-2">✕</div>
                    <div className="text-text-secondary">Likely Fake</div>
                    <div className="text-text-muted text-xs mt-1">0-39% authenticity</div>
                </div>
            </div>
        </div>
    );
}

export default DeepfakeAnalyzer;
