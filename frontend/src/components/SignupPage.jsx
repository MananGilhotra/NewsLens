/**
 * SignupPage - No GSAP, CSS Animations Only
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SignupPage() {
    const navigate = useNavigate();
    const { register, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords don\'t match');
            setLoading(false);
            triggerShake();
            return;
        }

        if (formData.password.length < 6) {
            setError('Password needs at least 6 characters');
            setLoading(false);
            triggerShake();
            return;
        }

        try {
            const result = await register(formData.name, formData.email, formData.password);
            if (result.success) {
                navigate('/app');
            } else {
                setError(result.error || 'Sign up failed');
                triggerShake();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Sign up failed');
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cyber-darker relative flex items-center justify-center px-4 py-12">
            <div className="data-stream" />
            <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-glow-green/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-glow-purple/10 rounded-full blur-3xl" />

            <div className={`relative z-10 w-full max-w-md animate-slide-up ${shake ? 'animate-shake' : ''}`}>
                {/* Logo */}
                <Link to="/" className="block text-center mb-8">
                    <h1 className="font-display text-3xl font-bold">
                        <span className="text-gradient-cyan">News</span>
                        <span className="text-white">Lens</span>
                    </h1>
                </Link>

                {/* Card */}
                <div className="cyber-card p-8">
                    <h2 className="font-display text-2xl text-white text-center mb-2">
                        Join NewsLens 🎉
                    </h2>
                    <p className="text-text-muted text-center text-sm mb-8">
                        Create your free account
                    </p>

                    {error && (
                        <div className="mb-6 p-4 border border-glow-red bg-glow-red/10 text-glow-red text-sm animate-fade-in">
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-text-secondary text-xs font-display mb-2 tracking-wider">
                                Your Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="cyber-input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

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

                        <div className="mb-4">
                            <label className="block text-text-secondary text-xs font-display mb-2 tracking-wider">
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="cyber-input"
                                placeholder="At least 6 characters"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-text-secondary text-xs font-display mb-2 tracking-wider">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="cyber-input"
                                placeholder="Type it again"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full cyber-button disabled:opacity-50 transition-opacity duration-300"
                        >
                            {loading ? '⏳ Creating account...' : '🚀 Sign Up'}
                        </button>
                    </form>

                    <p className="text-center text-text-muted text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-glow-cyan hover:underline">
                            Log in
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

export default SignupPage;
