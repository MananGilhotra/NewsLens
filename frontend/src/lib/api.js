/**
 * API client - one place that knows the backend URL and attaches the auth token.
 *
 * VITE_API_URL may be empty (dev: Vite proxies /api), "/api", or a full backend origin
 * with or without the /api suffix.
 */

import axios from 'axios';

const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = base.endsWith('/api') ? base : `${base}/api`;

export const api = axios.create({ baseURL: API_BASE, timeout: 90000 });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export function errorMessage(error, fallback = 'Something went wrong') {
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
    if (error?.message === 'Network Error' || error?.response?.status === 502 || error?.response?.status === 504) {
        return 'Cannot reach the NewsLens server. Is the backend running?';
    }
    return fallback;
}
