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
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-neutral-400">No agent found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] px-6 py-6">
            {/* Main Wrapper */}
            <div className="max-w-7xl mx-auto">

                {/* Header Component */}
                <DashboardHeader
                    tenantName={tenant?.organization_name || "Enterprise"}
                    onLogout={logout}
                />

                {/* Grid Layout */}
                <div className="grid grid-cols-12 gap-6 mt-6">

                    {/* Left Column: Side Navigation */}
                    <div className="col-span-1">
                        <SideNavigation onLogout={logout} />
                    </div>

                    {/* Middle Column: Agent Visualizer */}
                    <div className="col-span-7">
                        <AgentVisualizer
                            agentName={agent.agent_name}
                            agentDescription={agent.agent_description || "Enterprise-grade voice agent"}
                            totalCalls={0}
                            location={agent.location}
                            createdAt={agent.created_at}
                        />

                    </div>

                    {/* Right Column: AI Assistant */}
                    <div className="col-span-4">
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
