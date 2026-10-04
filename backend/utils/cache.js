/**
 * Tiny in-memory TTL cache with a size cap (oldest entries are evicted first).
 */

class TtlCache {
    constructor({ ttlMs, maxEntries = 500 }) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
        this.map = new Map();
    }

    get(key) {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        if (entry.expires < Date.now()) {
            this.map.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key, value) {
        this.map.delete(key);
        this.map.set(key, { value, expires: Date.now() + this.ttlMs });
        while (this.map.size > this.maxEntries) {
            this.map.delete(this.map.keys().next().value);
        }
        return value;
    }

    /** Returns the cached value or computes, caches and returns it. Concurrent callers share one promise. */
    async wrap(key, compute) {
        const hit = this.get(key);
        if (hit !== undefined) return hit;
        const promise = Promise.resolve().then(compute);
        this.set(key, promise);
        try {
            const value = await promise;
            this.set(key, value);
            return value;
        } catch (error) {
            this.map.delete(key);
            throw error;
        }
    }
}

module.exports = { TtlCache };
