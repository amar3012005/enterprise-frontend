"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";

import AgentVisualizer from "@/components/dashboard/AgentVisualizer";
import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";
import StatsCards from "@/components/dashboard/StatsCards";
import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";

const DEMO_TARA_AGENT = {
    agent_id: "agent-demo-001",
    agent_name: "TARA",
    agent_description: "Demo AI Voice Agent — Task-Aware Responsive Assistant",
    websocket_url: "wss://demo.davinciai.eu:8443",
    location: "EU-West",
    created_at: new Date().toISOString(),
    stats: { total_calls: 142, total_minutes: 487, success_rate: 0.942 },
};

export default function EnterpriseAgentDashboard() {
    const params = useParams();
    const agentId = params.agent_id as string;
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { agents, loading, selectedAgent, selectAgent } = useAgents();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        const storedTenant = localStorage.getItem("tenant");

        if (!token || !storedTenant) {
            router.push('/login');
            return;
        }

        const foundAgent = agents.find(a => a.agent_id === agentId);
        if (foundAgent) {
            selectAgent(foundAgent);
        }
    }, [agents, agentId, router, selectAgent]);

    // Fallback to demo TARA agent when agent not found in enterprise's agents
    const currentAgent = selectedAgent || agents.find(a => a.agent_id === agentId) ||
        (agentId === "agent-demo-001" ? DEMO_TARA_AGENT : null);

    if (loading && agents.length === 0 && !currentAgent) {
        return (
            <div style={{
                minHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5'
            }}>
                <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        color: isDark ? '#666' : '#888',
                        fontSize: '12px',
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                        fontFamily: 'JetBrains Mono, monospace'
                    }}
                >
                    INITIALIZING SYSTEM...
                </motion.div>
            </div>
        );
    }

    if (!currentAgent) {
        return (
            <div style={{
                minHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    style={{
                        color: isDark ? '#fff' : '#1a1a1a',
                        textAlign: 'center',
                        padding: '24px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        border: isDark ? '1px solid #222' : '1px solid #e5e5e5',
                    }}
                >
                    <p style={{
                        margin: '0 0 16px 0',
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'JetBrains Mono, monospace'
                    }}>
                        AGENT NOT FOUND
                    </p>
                    <a
                        href="/enterprise/dashboard/agents"
                        style={{
                            color: '#ef4444',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.05em'
                        }}
                    >
                        ← RETURN TO AGENTS
                    </a>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
                display: 'flex',
                gap: '16px',
                padding: '0',
                height: 'calc(100vh - 140px)', // Fill available viewport height
                width: '100%',
                overflow: 'hidden'
            }}
        >
            {/* Left Column - Visualizer - Flexible width */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                style={{ flex: 1, height: '100%', minWidth: 0 }}
            >
                <AgentVisualizer
                    agentName={currentAgent.agent_name}
                    agentDescription={currentAgent.agent_description || "Enterprise-grade voice agent"}
                    totalCalls={currentAgent?.stats?.total_calls ?? 0}
                    location={currentAgent.location}
                    createdAt={currentAgent.created_at}
                />
            </motion.div>

            {/* Right Column - AI Panel & Stats - Fixed width */}
            <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    width: '380px',
                    height: '100%',
                    flexShrink: 0
                }}
            >
                {/* AI Panel - Flexible height */}
                <div style={{ flex: 1, minHeight: 0 }}>
                    <AIAssistantPanel agentId={agentId} fallbackAgent={currentAgent} />
                </div>

                {/* Stats Cards - Fixed height */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    style={{ height: '140px', flexShrink: 0 }}
                >
                    <StatsCards
                        totalCalls={currentAgent?.stats?.total_calls ?? 0}
                        successRate={currentAgent?.stats?.success_rate ?? 0}
                    />
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
