import { useEffect, useState } from 'react';
import { api } from '../lib/api';

let cached = null;

/** Model card from /api/model (held-out metrics, datasets, source index size). Fetched once per page load. */
export default function useModelInfo() {
    const [info, setInfo] = useState(null);
    useEffect(() => {
        let alive = true;
        cached ||= api.get('/model', { timeout: 10000 }).then((r) => r.data.data).catch(() => null);
        cached.then((data) => alive && setInfo(data));
        return () => { alive = false; };
    }, []);
    return info;
}

/** Total number of samples the deployed model was fitted on (train + validation splits). */
export function trainingSamples(info) {
    const sizes = info?.splitSizes;
    if (!sizes) return null;
    return ['train', 'val'].reduce((sum, part) => sum + Object.values(sizes[part] || {}).reduce((a, b) => a + b, 0), 0);
}
