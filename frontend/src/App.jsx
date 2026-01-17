/**
 * App.jsx - Main Application Component (No GSAP)
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { AuthProvider, useAuth } from './context/AuthContext';
import HudOverlay from './components/HudOverlay';
import AnalyzeForm from './components/AnalyzeForm';
import Scanner from './components/Scanner';
import ResultDisplay from './components/ResultDisplay';
import NewsFeed from './components/NewsFeed';
import DeepfakeAnalyzer from './components/DeepfakeAnalyzer';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';

const API_URL = '/api';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-cyber-darker flex items-center justify-center">
                <div className="text-glow-cyan font-display animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function Dashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('feed');
    const [appState, setAppState] = useState('idle');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handlePageChange = (page) => {
        if (page === currentPage) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentPage(page);
            setAppState('idle');
            setResult(null);
            setError(null);
            setIsTransitioning(false);
        }, 200);
    };

    const handleAnalyze = async (data) => {
        setError(null);
        setAppState('scanning');

        try {
            const response = await axios.post(`${API_URL}/analyze`, data, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Wait minimum time for scanner effect
            await new Promise(resolve => setTimeout(resolve, 3000));

            if (response.data.success) {
                setResult(response.data.data);
                setAppState('result');
            } else {
                throw new Error(response.data.error || 'Analysis failed');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to analyze content');
            setAppState('idle');
        }
    };

    const handleReset = () => {
        setResult(null);
        setAppState('idle');
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-cyber-darker relative">
            <div className="data-stream" />
            <HudOverlay />
            <Scanner isActive={appState === 'scanning'} />

            <div className="relative z-10 min-h-screen flex flex-col pt-12 pb-10">
                {/* Header */}
                <header className="text-center py-6 md:py-8 px-4 animate-fade-in">
                    <div className="mb-4 flex justify-center">
                        <div className="relative cursor-pointer" onClick={() => handlePageChange('feed')}>
                            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-black tracking-wider">
                                <span className="text-gradient-cyan">VERITY</span>
                                <span className="text-white">AI</span>
                            </h1>
                            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-glow-cyan to-transparent" />
                        </div>
                    </div>

                    <div className="flex justify-center items-center gap-4 mb-4">
                        <span className="text-text-muted text-sm font-mono">
                            Hi, {user?.name || 'there'}!
                        </span>
                        <button
                            onClick={handleLogout}
                            className="text-glow-red text-xs font-display hover:underline"
                        >
                            Log Out
                        </button>
                    </div>

                    <p className="font-mono text-text-secondary text-sm max-w-xl mx-auto mb-6">
                        <span className="text-glow-green">▸</span> Trusted news feed with AI fact-checking & deepfake detection
                    </p>

                    {/* Navigation */}
                    <nav className="flex justify-center gap-2 md:gap-3 flex-wrap">
                        <button
                            onClick={() => handlePageChange('feed')}
                            className={`px-4 md:px-5 py-2 font-display text-sm tracking-wider border transition-all duration-300
                                ${currentPage === 'feed'
                                    ? 'border-glow-green bg-glow-green/10 text-glow-green'
                                    : 'border-cyber-border text-text-muted hover:border-glow-green/50 hover:text-text-secondary'
                                }`}
                        >
                            📡 News Feed
                        </button>
                        <button
                            onClick={() => handlePageChange('analyze')}
                            className={`px-4 md:px-5 py-2 font-display text-sm tracking-wider border transition-all duration-300
                                ${currentPage === 'analyze'
                                    ? 'border-glow-cyan bg-glow-cyan/10 text-glow-cyan'
                                    : 'border-cyber-border text-text-muted hover:border-glow-cyan/50 hover:text-text-secondary'
                                }`}
                        >
                            📰 Check News
                        </button>
                        <button
                            onClick={() => handlePageChange('deepfake')}
                            className={`px-4 md:px-5 py-2 font-display text-sm tracking-wider border transition-all duration-300
                                ${currentPage === 'deepfake'
                                    ? 'border-glow-purple bg-glow-purple/10 text-glow-purple'
                                    : 'border-cyber-border text-text-muted hover:border-glow-purple/50 hover:text-text-secondary'
                                }`}
                        >
                            🎭 Deepfake
                        </button>
                    </nav>
                </header>

                {/* Main Content */}
                <main className={`flex-1 px-4 py-4 transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                    {error && (
                        <div className="max-w-2xl mx-auto mb-6 p-4 cyber-card glow-border-red bg-red-500/10 animate-fade-in">
                            <div className="flex items-center gap-2 text-glow-red">
                                <span>⚠</span>
                                <span className="font-display">Oops!</span>
                            </div>
                            <p className="text-text-secondary mt-2">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="mt-3 text-sm text-text-muted hover:text-glow-cyan"
                            >
                                Dismiss ✕
                            </button>
                        </div>
                    )}

                    {currentPage === 'analyze' && (
                        <>
                            {appState === 'idle' && <AnalyzeForm onSubmit={handleAnalyze} isLoading={false} />}
                            {appState === 'result' && result && <ResultDisplay result={result} onReset={handleReset} />}
                        </>
                    )}

                    {currentPage === 'deepfake' && <DeepfakeAnalyzer />}
                    {currentPage === 'feed' && <NewsFeed />}
                </main>

                <footer className="text-center py-4 px-4 text-xs text-text-muted">
                    <p>© 2026 NewsLens. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
