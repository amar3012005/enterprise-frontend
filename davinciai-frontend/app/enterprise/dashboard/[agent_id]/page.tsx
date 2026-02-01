"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// Import modular components
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SideNavigation from "@/components/dashboard/SideNavigation";
import AgentVisualizer from "@/components/dashboard/AgentVisualizer";
import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";
import StatsCards from "@/components/dashboard/StatsCards";

export default function EnterpriseAgentDashboard() {
    const params = useParams();
    const agentId = params.agent_id as string;

    const [agent, setAgent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const token = localStorage.getItem("access_token");
        const storedUser = localStorage.getItem("user");
        const storedTenant = localStorage.getItem("tenant");

        if (!token || !storedUser || !storedTenant) {
            window.location.href = "/login";
            return;
        }

        setUser(JSON.parse(storedUser));
        const tenantData = JSON.parse(storedTenant);
        setTenant(tenantData);
        fetchAgentData(tenantData.tenant_id);
    }, [isMounted]);

    const fetchAgentData = async (tenantId: string) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/tenants/${tenantId}/agents`);
            if (!response.ok) throw new Error("Failed to load agent");
            const data = await response.json();
            setAgent(data[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#666' }}>Loading dashboard...</div>
            </div>
        );
    }

    if (!agent) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#666' }}>No agent found</div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#e6e6e6',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#1a1a1a',
            padding: '24px'
        }}>
            {/* Main Wrapper */}
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                {/* Header Component */}
                <DashboardHeader
                    tenantName={tenant?.organization_name || "Enterprise"}
                    onLogout={logout}
                />

                {/* Grid Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

                    {/* Left Column: Side Navigation */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <SideNavigation onLogout={logout} />
                    </div>

                    {/* Middle Column: Agent Visualizer */}
                    <div style={{ gridColumn: 'span 7' }}>
                        <AgentVisualizer
                            agentName={agent.agent_name}
                            agentDescription={agent.agent_description || "Enterprise-grade voice agent"}
                            totalCalls={0}
                            location={agent.location}
                            createdAt={agent.created_at}
                        />

                    </div>

                    {/* Right Column: AI Assistant */}
                    <div style={{ gridColumn: 'span 4' }}>
                        <AIAssistantPanel agentId={agentId} />

                        {/* Stats Cards Below */}
                        <StatsCards
                            totalCalls={agent.stats.total_calls}
                            successRate={agent.stats.success_rate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
