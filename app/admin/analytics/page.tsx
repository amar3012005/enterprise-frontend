"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Activity, DollarSign, Users, Building, Bot, PhoneCall, TrendingUp } from "lucide-react";

interface GlobalMetrics {
    total_calls: number;
    total_minutes: number;
    total_revenue: number;
    total_tenants: number;
    total_users: number;
    total_agents: number;
}

export default function AdminAnalyticsPage() {
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/api/admin/metrics/overview");
        if (res.ok) setMetrics(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-12 h-12 border-4 border-[#ff5722]/30 border-t-[#ff5722] rounded-full animate-spin" /></div>;

    if (!metrics) return <div className="flex h-full items-center justify-center text-[#555]">No data</div>;

    const cards = [
        { label: "Total Revenue", value: `€${metrics.total_revenue.toLocaleString()}`, icon: DollarSign, color: "from-emerald-600 to-emerald-900", text: "text-emerald-400", border: "border-emerald-500/20", description: "Sum of all cost_euros in call_logs" },
        { label: "Total Calls", value: metrics.total_calls.toLocaleString(), icon: PhoneCall, color: "from-blue-600 to-blue-900", text: "text-blue-400", border: "border-blue-500/20", description: "COUNT(*) FROM call_logs" },
        { label: "Total Minutes", value: metrics.total_minutes.toLocaleString(), icon: Activity, color: "from-purple-600 to-purple-900", text: "text-purple-400", border: "border-purple-500/20", description: "SUM(duration_seconds) / 60" },
        { label: "Active Tenants", value: metrics.total_tenants.toLocaleString(), icon: Building, color: "from-[#ff5722] to-orange-900", text: "text-[#ff5722]", border: "border-[#ff5722]/20", description: "COUNT(*) FROM tenants" },
        { label: "Registered Users", value: metrics.total_users.toLocaleString(), icon: Users, color: "from-cyan-600 to-cyan-900", text: "text-cyan-400", border: "border-cyan-500/20", description: "COUNT(*) FROM users" },
        { label: "Deployed Agents", value: metrics.total_agents.toLocaleString(), icon: Bot, color: "from-amber-600 to-amber-900", text: "text-amber-400", border: "border-amber-500/20", description: "COUNT(*) FROM agents" },
    ];

    return (
        <div className="p-8 lg:p-10">
            <div className="mb-10">
                <h1 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                    <TrendingUp size={24} className="text-[#ff5722]" />
                    Platform Analytics
                </h1>
                <p className="text-[#555] text-xs mt-1 tracking-wide">Global metrics aggregated across all tenants</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.label} className={`bg-[#0a0a0e] rounded-xl border ${card.border} p-6 relative overflow-hidden group hover:border-[#333] transition-all duration-300`}>
                        {/* Glow */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.color} opacity-5 rounded-full translate-x-12 -translate-y-12 group-hover:opacity-10 transition-opacity`} />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold">{card.label}</span>
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center opacity-80`}>
                                    <card.icon size={16} className="text-white" />
                                </div>
                            </div>
                            <div className={`text-4xl font-bold ${card.text} mb-2`}>{card.value}</div>
                            <p className="text-[10px] text-[#333] font-mono">{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="mt-10 bg-[#0a0a0e] border border-[#1a1a1f] rounded-xl p-6">
                <h2 className="text-xs text-[#555] uppercase tracking-widest font-bold mb-4">PostgreSQL Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#060608] rounded-lg p-4 border border-[#111115]">
                        <p className="text-[10px] text-[#444] font-mono mb-1">AVG Cost/Call</p>
                        <p className="text-lg font-bold text-emerald-400">
                            €{metrics.total_calls > 0 ? (metrics.total_revenue / metrics.total_calls).toFixed(4) : "0.00"}
                        </p>
                    </div>
                    <div className="bg-[#060608] rounded-lg p-4 border border-[#111115]">
                        <p className="text-[10px] text-[#444] font-mono mb-1">AVG Duration</p>
                        <p className="text-lg font-bold text-blue-400">
                            {metrics.total_calls > 0 ? ((metrics.total_minutes * 60 / metrics.total_calls) / 60).toFixed(1) : "0"} min
                        </p>
                    </div>
                    <div className="bg-[#060608] rounded-lg p-4 border border-[#111115]">
                        <p className="text-[10px] text-[#444] font-mono mb-1">Agents/Tenant</p>
                        <p className="text-lg font-bold text-amber-400">
                            {metrics.total_tenants > 0 ? (metrics.total_agents / metrics.total_tenants).toFixed(1) : "0"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
