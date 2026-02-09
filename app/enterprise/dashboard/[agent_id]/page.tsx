"use client";

import { useEffect } from "react";
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
    stats: { total_calls: 142, total_minutes: 487, success_rate: 94.2 },
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
    }, [agents, agentId, router]);

    // Fallback to demo TARA agent when agent not found in enterprise's agents
    const currentAgent = selectedAgent || agents.find(a => a.agent_id === agentId) ||
        (agentId === "agent-demo-001" ? DEMO_TARA_AGENT : null);

    if (loading && agents.length === 0 && !currentAgent) {
        return (
            <div suppressHydrationWarning={true} style={{ minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div suppressHydrationWarning={true} style={{ color: isDark ? '#fff' : '#1a1a1a', fontSize: '18px', fontWeight: 500 }}>Loading dashboard...</div>
            </div>
        );
    }

    if (!currentAgent) {
        return (
            <div suppressHydrationWarning={true} style={{ minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: isDark ? '#fff' : '#1a1a1a' }}>Agent not found. <a href="/enterprise/dashboard/agents" style={{ color: '#ff5722', textDecoration: 'underline' }}>Back to agents</a></div>
            </div>
        );
    }

    return (

        <div style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: 24 }}>
            <div>
                <AgentVisualizer
                    agentName={currentAgent.agent_name}
                    agentDescription={currentAgent.agent_description || "Enterprise-grade voice agent"}
                    totalCalls={0}
                    location={currentAgent.location}
                    createdAt={currentAgent.created_at}
                />
            </div>

            <div>
                <AIAssistantPanel agentId={agentId} fallbackAgent={currentAgent} />
                <StatsCards
                    totalCalls={currentAgent?.stats?.total_calls ?? 0}
                    successRate={currentAgent?.stats?.success_rate ?? 0}
                />
            </div>
        </div>
    );

}
