/**
 * LoginPage
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, useAnimationControls } from 'framer-motion';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';
import AuthLayout from './auth/AuthLayout';
import FormField from './auth/FormField';
import { useToast } from './ui/Toast';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const controls = useAnimationControls();
    const toast = useToast();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const redirectTo = location.state?.from || '/app';

    useEffect(() => {
        if (isAuthenticated) navigate(redirectTo, { replace: true });
    }, [isAuthenticated, navigate, redirectTo]);

    const update = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value });
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await login(form.email, form.password);
            toast(`Welcome back${result.user?.name ? `, ${result.user.name.split(' ')[0]}` : ''}`, { tone: 'success' });
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Login failed'));
            controls.start({ x: [0, -12, 10, -6, 4, 0], transition: { duration: 0.5 } });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back."
            subtitle="Log in to keep reading between the lines."
            footer={<>New to NewsLens? <Link to="/signup" className="text-lens link-underline">Create an account</Link></>}
        >
            <motion.form animate={controls} onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert"
                        className="flex items-start gap-3 rounded-2xl border border-fake/30 bg-fake/10 p-4 text-sm text-fake">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                    </motion.div>
                )}
                <FormField label="Email" type="email" name="email" autoComplete="email" value={form.email} onChange={update} required />
                <FormField label="Password" type="password" name="password" autoComplete="current-password" value={form.password} onChange={update} required />
                <button type="submit" disabled={loading || !form.email || !form.password} className="btn-primary mt-2 w-full py-4 text-[0.95rem]">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging in…</> : <>Log in <ArrowRight className="h-4 w-4" /></>}
                </button>
            </motion.form>
        </AuthLayout>
    );
}
