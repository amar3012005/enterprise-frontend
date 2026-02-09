"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Users,
    Plus,
    RefreshCcw,
    ChevronRight,
    Mic,
    Phone,
    Zap
} from "lucide-react";


import { useTheme } from "@/context/ThemeContext";
import { useAgents, invalidateAgentsCache } from "@/context/AgentContext";


export default function EnterpriseAgentsDashboard() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { agents, loading, error, refresh, isStale, selectedAgent, selectAgent } = useAgents();

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        if (!storedTenant) {
            router.push('/login');
        }
    }, [router]);

    const logout = () => {
        localStorage.clear();
        router.push('/login');
    };

    const handleRefresh = async () => {
        invalidateAgentsCache();
        await refresh();
    };

    const navigateToDashboard = (agentId: string) => {
        router.push(`/enterprise/dashboard/${agentId}`);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: isDark ? '#111' : '#fff',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isDark ? '1px solid #222' : '1px solid #eee'
                        }}>
                            <Users size={20} color={isDark ? '#fff' : '#000'} />
                        </div>
                        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>Voice Agents</h1>
                    </div>
                    <p style={{ color: '#666', margin: 0, marginLeft: '52px' }}>
                        Manage and monitor your fleet of AI voice agents
                        {isStale && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>● Data may be outdated</span>}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleRefresh} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        border: isDark ? '1px solid #222' : '1px solid #e5e5e5',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#666',
                        cursor: 'pointer'
                    }}>
                        <RefreshCcw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: isDark ? '#fff' : '#000',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isDark ? '#000' : '#fff',
                        cursor: 'pointer'
                    }}>
                        <Plus size={16} />
                        New Agent
                    </button>
                </div>
            </div>

            {loading && agents.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
                    <div style={{ width: '48px', height: '48px', border: '3px solid #e5e5e5', borderTop: '3px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : error && agents.length === 0 ? (
                <div style={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '24px', padding: '48px', textAlign: 'center', border: isDark ? '1px solid #222' : '1px solid #eee' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Connection Error</h3>
                    <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
                    <button onClick={handleRefresh} style={{ padding: '12px 24px', backgroundColor: isDark ? '#fff' : '#000', border: 'none', borderRadius: '12px', color: isDark ? '#000' : '#fff', cursor: 'pointer' }}>Retry</button>
                </div>
            ) : agents.length === 0 ? (
                <div style={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '24px', padding: '64px', textAlign: 'center', border: isDark ? '1px solid #222' : '1px solid #eee' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>No Agents Yet</h3>
                    <p style={{ color: '#666', marginBottom: '32px' }}>Get started by creating your first voice agent.</p>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', backgroundColor: isDark ? '#fff' : '#000', border: 'none', borderRadius: '12px', color: isDark ? '#000' : '#fff', cursor: 'pointer' }}>
                        <Plus size={18} />Create Your First Agent
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                    {agents.map((agent) => (
                        <AgentCard key={agent.agent_id} agent={agent} isDark={isDark} onClick={() => navigateToDashboard(agent.agent_id)} />
                    ))}
                </div>
            )}
        </motion.div>
    );
}



function AgentCard({ agent, isDark, onClick }: { agent: any; isDark: boolean; onClick: () => void }) {
    return (
        <motion.div whileHover={{ y: -4 }} onClick={onClick} style={{
            backgroundColor: isDark ? '#111' : '#fff',
            borderRadius: '24px',
            padding: '24px',
            border: isDark ? '1px solid #222' : '1px solid #eee',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: isDark ? '#000' : '#f5f5f5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isDark ? '1px solid #222' : 'none' }}>
                        <Mic size={24} color={isDark ? '#666' : '#999'} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{agent.agent_name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Active</span>
                        </div>
                    </div>
                </div>
                <ChevronRight size={20} color={isDark ? '#444' : '#ccc'} />
            </div>
            <p style={{ color: '#666', fontSize: '14px', margin: '16px 0', lineHeight: '1.5' }}>{agent.agent_description || "Enterprise-grade voice agent."}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: isDark ? '1px solid #222' : '1px solid #f0f0f0' }}>
                <MiniStat icon={<Phone size={12} />} label="Calls" value={agent.stats?.total_calls || 0} isDark={isDark} />
                <MiniStat icon={<Zap size={12} />} label="Usage" value={`${agent.stats?.total_minutes || 0}m`} isDark={isDark} />
            </div>
        </motion.div>
    );
}

function MiniStat({ icon, label, value, isDark }: { icon: React.ReactNode; label: string; value: string | number; isDark: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: '#666' }}>{icon}</div>
            <div style={{ fontSize: '12px' }}>
                <span style={{ color: '#666', marginRight: '4px' }}>{label}:</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
        </div>
    );
}
