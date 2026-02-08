"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";


import AgentVisualizer from "@/components/dashboard/AgentVisualizer";
import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";
import StatsCards from "@/components/dashboard/StatsCards";
import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";

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

    const currentAgent = selectedAgent || agents.find(a => a.agent_id === agentId);

    if (loading && agents.length === 0) {
        return (
            <div suppressHydrationWarning={true} style={{ minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div suppressHydrationWarning={true} style={{ color: isDark ? '#fff' : '#1a1a1a', fontSize: '18px', fontWeight: 500 }}>Loading dashboard...</div>
            </div>
        );
    }

    if (!currentAgent) {
        return (
            <div suppressHydrationWarning={true} style={{ minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: isDark ? '#fff' : '#1a1a1a' }}>Loading agent...</div>
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
                <AIAssistantPanel agentId={agentId} />
                <StatsCards
                    totalCalls={currentAgent?.stats?.total_calls ?? 0}
                    successRate={currentAgent?.stats?.success_rate ?? 0}
                />
            </div>
        </div>
    );

}
