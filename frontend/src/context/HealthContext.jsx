/**
 * HealthContext - which backend capabilities are live (database, LLM, news provider, ML model).
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const HealthContext = createContext({ health: null, online: null, refresh: () => {} });

export function HealthProvider({ children }) {
    const [health, setHealth] = useState(null);
    const [online, setOnline] = useState(null);

    const refresh = useCallback(() => {
        api.get('/health', { timeout: 8000 })
            .then((response) => {
                setHealth(response.data);
                setOnline(true);
            })
            .catch(() => setOnline(false));
    }, []);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 60000);
        return () => clearInterval(timer);
    }, [refresh]);

    return <HealthContext.Provider value={{ health, online, refresh }}>{children}</HealthContext.Provider>;
}

export const useHealth = () => useContext(HealthContext);
