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
    Zap,
    ArrowRight
} from "lucide-react";


import { useTheme } from "@/context/ThemeContext";
import { useAgents, invalidateAgentsCache } from "@/context/AgentContext";


const DEMO_TARA_AGENT = {
    agent_id: "agent-demo-001",
    agent_name: "TARA",
    agent_description: "Demo AI Voice Agent — Task-Aware Responsive Assistant. Click to explore the dashboard with sample analytics and call logs.",
    is_demo: true,
    stats: { total_calls: 142, total_minutes: 487, success_rate: 94.2 },
};

export default function EnterpriseAgentsDashboard() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { agents, loading, error, refresh, isStale, selectedAgent, selectAgent } = useAgents();

    // Show demo TARA agent when enterprise has no agents
    const displayAgents = agents.length > 0 ? agents : [DEMO_TARA_AGENT];

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
            ) : (
                <>
                    {agents.length === 0 && (
                        <div style={{
                            marginBottom: '24px',
                            padding: '14px 20px',
                            backgroundColor: isDark ? 'rgba(255,87,34,0.08)' : 'rgba(255,87,34,0.06)',
                            border: isDark ? '1px solid rgba(255,87,34,0.2)' : '1px solid rgba(255,87,34,0.15)',
                            borderRadius: '12px',
                            fontSize: '13px',
                            color: isDark ? '#ff8a65' : '#e64a19',
                            fontWeight: 500
                        }}>
                            No agents configured yet — showing the demo TARA agent. Create your own agent to get started.
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 0',
                        minHeight: '60vh'
                    }}>
                        {displayAgents.length > 0 && (
                            <AgentCard
                                agent={displayAgents[0]}
                                isDark={isDark}
                                onClick={() => navigateToDashboard(displayAgents[0].agent_id)}
                            />
                        )}
                    </div>
                </>
            )}
        </motion.div>
    );
}



function AgentCard({ agent, isDark, onClick }: { agent: any; isDark: boolean; onClick: () => void }) {
    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={onClick}
                style={{
                    position: 'relative',
                    width: '340px',
                    height: '480px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(10,30,40,0.25)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
                className="group"
            >
                {/* 1. Constant Pulsing Glow Background */}
                <motion.div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.4), transparent 70%)`
                    }}
                    animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* 2. Dark Overlay for readability */}
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 0 }} />

                {/* Card Content - Overlaying the background */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', color: '#fff', zIndex: 10 }}>
                    {/* Header Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />
                                AGENT
                            </div>
                            <div style={{ width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                                <ArrowRight size={14} color="#fff" />
                            </div>
                        </div>
                    </div>

                    {/* Middle Section */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.15)',
                            marginBottom: '24px'
                        }}>
                            <Mic size={24} color="#ffffff" />
                        </div>

                        <h2 style={{ fontSize: '28px', fontWeight: 300, marginBottom: '8px', letterSpacing: '0.05em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {agent.agent_name}
                        </h2>

                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 300, maxWidth: '90%', margin: '0 auto', lineHeight: '1.6' }}>
                            {agent.agent_description || "Enterprise AI Assistant ready to manage interactions."}
                        </p>
                    </div>

                    {/* Click Here Hover Overlay */}
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 backdrop-blur-sm">
                        <div style={{
                            padding: '12px 28px',
                            backgroundColor: '#fff',
                            color: '#000',
                            borderRadius: '100px',
                            fontSize: '14px',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            Click to Manage
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Description Description - Below card */}
            <div style={{ marginTop: '24px', padding: '0 16px', maxWidth: '340px', textAlign: 'center' }}>
                <p style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '12px', lineHeight: '1.6', fontWeight: 300 }}>

                    Select this agent to view insights, access the live HiveMind monitoring panel, and manage configurations.
                </p>
            </div>
        </div>
    );
}