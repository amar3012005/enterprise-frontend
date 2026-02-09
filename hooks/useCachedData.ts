import { useState, useEffect, useCallback, useRef } from 'react';

const CACHE_EXPIRY = 5 * 60 * 1000;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

function getCacheKey(key: string): string {
    return `davinci_cache_${key}`;
}

function getCachedData<T>(key: string, ttl = CACHE_EXPIRY): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
        const cached = localStorage.getItem(getCacheKey(key));
        if (!cached) return null;
        
        const entry: CacheEntry<T> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;
        
        if (age > ttl) {
            localStorage.removeItem(getCacheKey(key));
            return null;
        }
        
        return entry.data;
    } catch {
        return null;
    }
}

function setCachedData<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
    } catch (e) {
        console.warn('Failed to cache data:', e);
    }
}

export function useCachedData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { autoRefresh?: boolean; ttl?: number } = {}
): {
    data: T | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isStale: boolean;
} {
    const { autoRefresh = true, ttl = CACHE_EXPIRY } = options;
    
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStale, setIsStale] = useState(false);
    
    const fetchDataRef = useRef<(() => Promise<void>) | null>(null);
    const keyRef = useRef(key);
    keyRef.current = key;

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const result = await fetchFn();
            clearTimeout(timeoutId);
            
            setData(result);
            setCachedData(keyRef.current, result);
            setIsStale(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    fetchDataRef.current = refresh;

    useEffect(() => {
        const loadFromCache = () => {
            const cached = getCachedData<T>(keyRef.current, ttl);
            if (cached) {
                setData(cached);
                const age = Date.now() - (JSON.parse(localStorage.getItem(getCacheKey(keyRef.current)) || '{}').timestamp || 0);
                setIsStale(age > ttl / 2);
            }
            setLoading(false);
        };

        loadFromCache();

        if (autoRefresh && fetchDataRef.current) {
            const interval = setInterval(() => {
                const cached = getCachedData<T>(keyRef.current, ttl);
                if (cached) {
                    setIsStale(true);
                }
            }, ttl / 2);
            
            return () => clearInterval(interval);
        }
    }, [ttl, autoRefresh]);

    useEffect(() => {
        if (!data) {
            refresh();
        }
    }, [data, refresh]);

    return { data, loading, error, refresh, isStale };
}

export function invalidateCache(key?: string) {
    if (typeof window === 'undefined') return;
    
    if (key) {
        localStorage.removeItem(getCacheKey(key));
    } else {
        Object.keys(localStorage)
            .filter(k => k.startsWith('davinci_cache_'))
            .forEach(k => localStorage.removeItem(k));
    }
}
