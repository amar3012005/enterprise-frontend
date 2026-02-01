"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    BarChart3,
    Users,
    Wallet,
    Bell,
    Search,
    LayoutDashboard,
    LogOut,
    RefreshCcw,
    User,
    Phone,
    Clock,
    TrendingUp,
    Activity,
    MessageSquare
} from "lucide-react";

export default function AgentsPage() {
    const [agent, setAgent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [user, setUser] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);

    useEffect(() => {
        // 1. Check Auth
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

        // 2. Fetch Agent
        fetchAgent(tenantData.tenant_id);
    }, []);

    const fetchAgent = async (tenantId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/tenants/${tenantId}/agents`);
            if (!response.ok) throw new Error("Failed to load agent data.");
            const data = await response.json();
            // Since there's only one agent per enterprise, take the first one
            setAgent(data[0] || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Connection failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    const successRatePct = agent ? (agent.stats.success_rate * 100).toFixed(1) : "0";

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans flex overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-neutral-950/50 backdrop-blur-xl">
                <div className="p-8">
                    <h1 className="text-2xl font-black text-gradient tracking-tighter">DaVinci AI</h1>
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-600 mt-2">Enterprise Edition</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
                    <NavItem icon={<Users size={20} />} label="Voice Agent" />
                    <NavItem icon={<BarChart3 size={20} />} label="Analytics" />
                    <NavItem icon={<Wallet size={20} />} label="Billing Center" />
                </nav>

                <div className="p-6 mt-auto">
                    <div className="glass-card rounded-2xl p-4 bg-primary-500/5 border-primary-500/20">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                                <Wallet className="text-primary-400" size={16} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Balance</span>
                        </div>
                        <div className="text-2xl font-mono font-bold text-white mb-1">€4,250.80</div>
                        <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Est. 14 Days Remaining</p>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full mt-6 px-4 py-3 rounded-xl hover:bg-danger-500/10 text-neutral-500 hover:text-danger-400 transition-all text-sm font-bold"
                    >
                        <LogOut size={18} />
                        <span>Terminate Session</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-neutral-950/20 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-primary-400 transition-colors" size={18} />
                            <input
                                placeholder="Search Infrastructure..."
                                className="bg-white/5 border border-white/5 rounded-xl h-11 pl-10 pr-4 w-80 outline-none focus:border-primary-500/30 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-neutral-400 hover:text-white transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-neutral-950" />
                        </button>
                        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                            <div className="text-right">
                                <p className="text-xs font-bold text-white">{user?.full_name || 'Operator'}</p>
                                <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">{tenant?.organization_name || 'System'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 p-px">
                                <div className="w-full h-full rounded-[11px] bg-neutral-900 flex items-center justify-center overflow-hidden">
                                    <User size={20} className="text-primary-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-10">
                        {/* Page Header */}
                        <div className="flex items-end justify-between">
                            <div>
                                <motion.h2
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-4xl font-black tracking-tight mb-2"
                                >
                                    Enterprise Voice Agent
                                </motion.h2>
                                <p className="text-neutral-500 font-medium">Powered by Cartesia Sonic-3 · Real-time monitoring</p>
                            </div>
                            <button
                                onClick={() => fetchAgent(tenant?.tenant_id)}
                                className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-xs font-bold"
                            >
                                <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
                                SYNC DATA
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="space-y-6">
                                <div className="h-[300px] rounded-3xl bg-white/[0.02] border border-white/5 loading-shimmer" />
                                <div className="grid grid-cols-4 gap-6">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-[120px] rounded-2xl bg-white/[0.02] border border-white/5 loading-shimmer" />
                                    ))}
                                </div>
                            </div>
                        ) : error ? (
                            <div className="p-12 rounded-3xl border border-danger-500/20 bg-danger-500/5 text-center">
                                <p className="text-danger-500 font-bold mb-4">{error}</p>
                                <button
                                    onClick={() => fetchAgent(tenant?.tenant_id)}
                                    className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase"
                                >
                                    Retry Connection
                                </button>
                            </div>
                        ) : agent ? (
                            <>
                                {/* Main Agent Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card rounded-3xl p-8 border border-white/5 relative overflow-hidden"
                                >
                                    {/* Background Glow */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[120px]" />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
                                                    <Activity size={36} />
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-bold text-white mb-2">{agent.agent_name}</h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-success-500 animate-pulse" />
                                                        <span className="text-xs font-bold uppercase tracking-widest text-success-500">
                                                            Active · Synchronized
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/5">
                                                <span className="text-xs font-bold text-neutral-400">AGENT ID</span>
                                                <p className="text-sm font-mono text-white mt-1">{agent.agent_id}</p>
                                            </div>
                                        </div>

                                        <p className="text-neutral-400 text-lg mb-8 max-w-3xl">
                                            {agent.agent_description}
                                        </p>

                                        {/* Success Rate Progress */}
                                        <div className="space-y-3 mb-8">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-neutral-500">Success Rate</span>
                                                <span className="font-bold text-success-500">{successRatePct}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${successRatePct}%` }}
                                                    transition={{ duration: 1, delay: 0.3 }}
                                                    className="h-full bg-gradient-to-r from-success-500 to-primary-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-4">
                                            <button className="flex-1 h-14 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold shadow-glow-primary transition-all">
                                                View Live Dashboard
                                            </button>
                                            <button className="flex-1 h-14 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all">
                                                Agent Settings
                                            </button>
                                            <button className="h-14 px-6 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                                                <MessageSquare size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <MetricCard
                                        icon={<Phone size={20} />}
                                        label="Total Calls"
                                        value={agent.stats.total_calls.toLocaleString()}
                                        color="primary"
                                    />
                                    <MetricCard
                                        icon={<Clock size={20} />}
                                        label="Total Minutes"
                                        value={agent.stats.total_minutes.toLocaleString()}
                                        color="accent"
                                    />
                                    <MetricCard
                                        icon={<TrendingUp size={20} />}
                                        label="Success Rate"
                                        value={`${successRatePct}%`}
                                        color="success"
                                    />
                                    <MetricCard
                                        icon={<Activity size={20} />}
                                        label="AI Engine"
                                        value="Cartesia V2"
                                        color="primary"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="p-12 rounded-3xl border border-white/10 bg-white/[0.02] text-center">
                                <p className="text-neutral-500 font-bold mb-4">No agent configured for this enterprise</p>
                                <button className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold">
                                    <Plus size={18} className="inline mr-2" />
                                    Deploy Agent
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
    return (
        <button className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl transition-all group ${active ? 'bg-primary-500/10 text-primary-400' : 'text-neutral-500 hover:bg-white/5 hover:text-white'}`}>
            <div className={`${active ? 'text-primary-400' : 'text-neutral-600 group-hover:text-primary-400'} transition-colors`}>
                {icon}
            </div>
            <span className="text-sm font-bold">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow-primary" />}
        </button>
    );
}

function MetricCard({ icon, label, value, color = "primary" }: any) {
    const colorMap: any = {
        primary: "text-primary-400 bg-primary-500/10",
        accent: "text-accent-400 bg-accent-500/10",
        success: "text-success-400 bg-success-500/10"
    };

    return (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
            <div className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-2">{label}</p>
            <h4 className="text-2xl font-mono font-bold text-white">{value}</h4>
        </div>
    );
}
