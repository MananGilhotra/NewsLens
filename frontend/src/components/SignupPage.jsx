/**
 * SignupPage
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useAnimationControls } from 'framer-motion';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';
import AuthLayout from './auth/AuthLayout';
import FormField from './auth/FormField';
import { useToast } from './ui/Toast';

function strengthOf(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return score;
}
const STRENGTH = [
    { label: 'Too short', color: 'bg-fake' },
    { label: 'Weak', color: 'bg-fake' },
    { label: 'Okay', color: 'bg-unsure' },
    { label: 'Good', color: 'bg-lens' },
    { label: 'Strong', color: 'bg-real' }
];

export default function SignupPage() {
    const navigate = useNavigate();
    const { register, isAuthenticated } = useAuth();
    const controls = useAnimationControls();
    const toast = useToast();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [touched, setTouched] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate('/app', { replace: true });
    }, [isAuthenticated, navigate]);

    const strength = strengthOf(form.password);
    const fieldErrors = useMemo(() => ({
        name: form.name.trim().length > 0 && form.name.trim().length < 2 ? 'Name needs at least 2 characters' : '',
        email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) ? 'Enter a valid email address' : '',
        password: form.password && form.password.length < 6 ? 'Use at least 6 characters' : '',
        confirmPassword: form.confirmPassword && form.confirmPassword !== form.password ? 'Passwords don’t match' : ''
    }), [form]);

    const update = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value });
        setError('');
    };
    const blur = (event) => setTouched({ ...touched, [event.target.name]: true });
    const shake = () => controls.start({ x: [0, -12, 10, -6, 4, 0], transition: { duration: 0.5 } });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setTouched({ name: true, email: true, password: true, confirmPassword: true });
        const firstError = Object.values(fieldErrors).find(Boolean);
        if (firstError || !form.name || !form.email || !form.password || form.password !== form.confirmPassword) {
            setError(firstError || 'Please fill in every field');
            shake();
            return;
        }
        setLoading(true);
        try {
            await register(form.name.trim(), form.email, form.password);
            toast('Account created - welcome to NewsLens', { tone: 'success' });
            navigate('/app', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Sign up failed'));
            shake();
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Join NewsLens."
            subtitle="Free forever. Verify anything you read in seconds."
            footer={<>Already have an account? <Link to="/login" className="text-lens link-underline">Log in</Link></>}
        >
            <motion.form animate={controls} onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert"
                        className="flex items-start gap-3 rounded-2xl border border-fake/30 bg-fake/10 p-4 text-sm text-fake">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                    </motion.div>
                )}
                <FormField label="Your name" name="name" autoComplete="name" value={form.name} onChange={update} onBlur={blur} error={touched.name && fieldErrors.name} required />
                <FormField label="Email" type="email" name="email" autoComplete="email" value={form.email} onChange={update} onBlur={blur} error={touched.email && fieldErrors.email} required />
                <div>
                    <FormField label="Password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={update} onBlur={blur} error={touched.password && fieldErrors.password} required />
                    {form.password && (
                        <div className="mt-2.5 flex items-center gap-3 px-1">
                            <div className="flex flex-1 gap-1.5">
                                {[0, 1, 2, 3].map((i) => (
                                    <motion.span key={i} className={`h-1 flex-1 rounded-full ${i < strength ? STRENGTH[strength].color : 'bg-white/[0.08]'}`}
                                        initial={false} animate={{ opacity: i < strength ? 1 : 0.6 }} />
                                ))}
                            </div>
                            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-faint">{STRENGTH[strength].label}</span>
                        </div>
                    )}
                </div>
                <FormField label="Confirm password" type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={update} onBlur={blur} error={touched.confirmPassword && fieldErrors.confirmPassword} required />
                <button type="submit" disabled={loading} className="btn-primary mt-2 w-full py-4 text-[0.95rem]">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
                </button>
            </motion.form>
        </AuthLayout>
    );
}
