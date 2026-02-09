"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

interface Agent {
    agent_id: string;
    agent_name: string;
    agent_description?: string;
    location?: string;
    created_at?: string;
    stats?: {
        total_calls: number;
        total_minutes: number;
        success_rate: number;
    };
}

interface AgentContextType {
    agents: Agent[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isStale: boolean;
    selectedAgent: Agent | null;
    selectAgent: (agent: Agent | null) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const CACHE_KEY = 'davinci_agents';
const CACHE_TTL = 5 * 60 * 1000;

function getCache(): { data: Agent[]; timestamp: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const entry = JSON.parse(cached);
        if (Date.now() - entry.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return entry;
    } catch {
        return null;
    }
}

function setCache(agents: Agent[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: agents, timestamp: Date.now() }));
    } catch (e) {
        console.warn('Failed to cache agents:', e);
    }
}

function getSelectedAgent(): Agent | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('davinci_selected_agent');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function setSelectedAgent(agent: Agent | null) {
    if (typeof window === 'undefined') return;
    if (agent) {
        localStorage.setItem('davinci_selected_agent', JSON.stringify(agent));
    } else {
        localStorage.removeItem('davinci_selected_agent');
    }
}

export function AgentProvider({ children }: { children: ReactNode }) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStale, setIsStale] = useState(false);
    const [selectedAgent, setSelectedAgentState] = useState<Agent | null>(null);

    const fetchAgents = useCallback(async () => {
        const tenant = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
        if (!tenant) {
            setError('No tenant found');
            setLoading(false);
            return;
        }

        const tenantData = JSON.parse(tenant);
        if (!tenantData?.tenant_id) {
            setError('Invalid tenant');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await apiFetch(`/api/tenants/${tenantData.tenant_id}/agents`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Failed to load agents');

            const data = await response.json();
            setAgents(data);
            setCache(data);
            setIsStale(false);

            // Only set a default if none is selected
            setSelectedAgentState(prev => {
                if (!prev && data.length > 0) {
                    const first = data[0];
                    setSelectedAgent(first);
                    return first;
                }
                return prev;
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Connection failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []); // Removed selectedAgent dependency to keep identity stable

    const selectAgent = useCallback((agent: Agent | null) => {
        setSelectedAgentState(agent);
        setSelectedAgent(agent);
    }, []);

    // Initial load
    useEffect(() => {
        // Restore from cache on mount (client-side only)
        const cached = getCache();
        if (cached) {
            setAgents(cached.data);
            setIsStale(Date.now() - cached.timestamp > CACHE_TTL / 2);
        }

        const storedSelected = getSelectedAgent();
        if (storedSelected) {
            setSelectedAgentState(storedSelected);
        }

        fetchAgents();
    }, [fetchAgents]);

    const refresh = useCallback(async () => {
        localStorage.removeItem(CACHE_KEY);
        await fetchAgents();
    }, [fetchAgents]);

    return (
        <AgentContext.Provider value={{ agents, loading, error, refresh, isStale, selectedAgent, selectAgent }}>
            {children}
        </AgentContext.Provider>
    );
}

export function useAgents() {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgents must be used within AgentProvider');
    }
    return context;
}


export function invalidateAgentsCache() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_KEY);
    }
}
