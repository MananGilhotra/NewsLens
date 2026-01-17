/**
 * LoginPage - No GSAP, CSS Animations Only
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/app');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate('/app');
            } else {
                setError(result.error || 'Login failed');
                setShake(true);
                setTimeout(() => setShake(false), 500);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            setShake(true);
            setTimeout(() => setShake(false), 500);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cyber-darker relative flex items-center justify-center px-4">
            <div className="data-stream" />
            <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-glow-cyan/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-glow-purple/10 rounded-full blur-3xl" />

            <div className={`relative z-10 w-full max-w-md animate-slide-up ${shake ? 'animate-shake' : ''}`}>
                {/* Logo */}
                <Link to="/" className="block text-center mb-8">
                    <h1 className="font-display text-3xl font-bold">
                        <span className="text-gradient-cyan">VERITY</span>
                        <span className="text-white">AI</span>
                    </h1>
                </Link>

                {/* Card */}
                <div className="cyber-card p-8">
                    <h2 className="font-display text-2xl text-white text-center mb-2">
                        Welcome Back! 👋
                    </h2>
                    <p className="text-text-muted text-center text-sm mb-8">
                        Log in to continue checking news
                    </p>

                    {error && (
                        <div className="mb-6 p-4 border border-glow-red bg-glow-red/10 text-glow-red text-sm animate-fade-in">
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-text-secondary text-xs font-display mb-2 tracking-wider">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="cyber-input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-text-secondary text-xs font-display mb-2 tracking-wider">
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="cyber-input"
                                placeholder="Your password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full cyber-button disabled:opacity-50 transition-opacity duration-300"
                        >
                            {loading ? '⏳ Logging in...' : '🚀 Log In'}
                        </button>
                    </form>

                    <p className="text-center text-text-muted text-sm mt-6">
                        New here?{' '}
                        <Link to="/signup" className="text-glow-cyan hover:underline">
                            Create an account
                        </Link>
                    </p>
                </div>

                <p className="text-center mt-6">
                    <Link to="/" className="text-text-muted text-sm hover:text-glow-cyan transition-colors duration-300">
                        ← Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
