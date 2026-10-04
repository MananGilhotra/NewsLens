/**
 * AuthContext - Authentication State Management
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

    // Validate a saved token on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (!savedToken) return;
        api.get('/auth/me')
            .then((response) => setUser(response.data.data))
            .catch((error) => {
                // Only drop the token when the server rejects it, not when it is unreachable
                if (error.response?.status === 401 || error.response?.status === 404) {
                    localStorage.removeItem('token');
                    setToken(null);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const storeSession = useCallback(({ token: newToken, user: userData }) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
    }, []);

    const register = useCallback(async (name, email, password) => {
        const response = await api.post('/auth/register', { name, email, password });
        storeSession(response.data.data);
        return { success: true, user: response.data.data.user };
    }, [storeSession]);

    const login = useCallback(async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        storeSession(response.data.data);
        return { success: true, user: response.data.data.user };
    }, [storeSession]);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: Boolean(token),
        loading,
        register,
        login,
        logout
    }), [user, token, loading, register, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
