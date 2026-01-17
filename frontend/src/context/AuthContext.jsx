/**
 * AuthContext - Authentication State Management
 */

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Check if user is authenticated on mount
    useEffect(() => {
        const checkAuth = async () => {
            const savedToken = localStorage.getItem('token');
            if (savedToken) {
                try {
                    const response = await axios.get(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${savedToken}` }
                    });
                    if (response.data.success) {
                        setUser(response.data.data);
                        setToken(savedToken);
                    }
                } catch (error) {
                    console.log('Auth check failed, clearing token');
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    // Register function
    const register = async (name, email, password) => {
        const response = await axios.post(`${API_URL}/auth/register`, {
            name,
            email,
            password
        });

        if (response.data.success) {
            const { token: newToken, user: userData } = response.data.data;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            return { success: true };
        }
        return { success: false, error: response.data.error };
    };

    // Login function
    const login = async (email, password) => {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        });

        if (response.data.success) {
            const { token: newToken, user: userData } = response.data.data;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            return { success: true };
        }
        return { success: false, error: response.data.error };
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        isAuthenticated: !!token,
        loading,
        register,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
