import { startTransition, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

/**
 * Logs out and goes home. Both updates run in one transition: React Router navigates inside
 * startTransition, so an urgent logout would otherwise render "signed out on /app" first and
 * trigger the redirect-to-login guard.
 */
export default function useLogout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    return useCallback(() => {
        startTransition(() => {
            logout();
            navigate('/');
        });
        toast('Signed out');
    }, [logout, navigate, toast]);
}
