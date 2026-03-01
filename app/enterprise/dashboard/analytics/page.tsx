"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    BarChart3,
    Phone,
    Clock,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Brain,
    AlertTriangle,
    Flame,
    Wallet,
    Activity,
    Zap,
} from "lucide-react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";
import { apiFetch } from "@/lib/api";

// ============= TYPES =============
interface AnalyticsData {
    // Today's metrics
    total_calls_today: number;
    total_minutes_today: number;
    total_cost_today: number;
    
    // All-time metrics
    total_calls_all_time: number;
    total_minutes_all_time: number;
    total_cost_all_time: number;
    
    // Performance metrics
    success_rate: number;
    avg_call_duration: number;
    active_calls: number;
    
    // Graph data
    call_volume_trend: { hour: string; calls: number; cost: number }[];
    monthly_trend: { month: string; calls: number; cost: number }[];
    cost_breakdown: {
        [key: string]: { calls: number; cost: number };
    };
    
    // Intelligence
    leads_today: number;
    churn_risks_today: number;
    avg_agent_iq: number;
    
    // Comparisons
    calls_change_percent: number;
    cost_change_percent: number;
}

interface WalletData {
    balance_euros: number;
    estimated_calls_remaining: number;
    balance_status: "healthy" | "low" | "critical";
}

// ============= COMPONENT =============
export default function EnterpriseDashboardAnalyticsPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { selectedAgent, loading: agentLoading } = useAgents();

    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const tenant = localStorage.getItem("tenant");
        if (!tenant) return;

        const tenantData = JSON.parse(tenant);

        try {
            const [analyticsRes, walletRes] = await Promise.all([
                apiFetch(`/api/metrics/analytics${selectedAgent ? `?agent_id=${selectedAgent.agent_id}` : ""}`),
                apiFetch(`/api/wallet/${tenantData.tenant_id}`),
            ]);

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData);
            }

            if (walletRes.ok) {
                const walletData = await walletRes.json();
                setWallet(walletData);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedAgent]);

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        if (!storedTenant) {
            router.push("/login");
            return;
        }
        fetchData();
    }, [router, fetchData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading || agentLoading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: isDark ? "#0a0a0a" : "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <RefreshCw size={32} color={isDark ? "#333" : "#ccc"} />
                </motion.div>
            </div>
        );
    }

    // Prepare chart data
    const volumeData = analytics?.call_volume_trend || [];
    const monthlyData = analytics?.monthly_trend || [];
    
    const costData = analytics?.cost_breakdown
        ? Object.entries(analytics.cost_breakdown).map(([range, data]) => ({
            range: range.replace("_min", "").replace("_", "-"),
            calls: data.calls,
            cost: data.cost,
        }))
        : [
            { range: "0-5", calls: 0, cost: 0 },
            { range: "5-10", calls: 0, cost: 0 },
            { range: "10-15", calls: 0, cost: 0 },
            { range: "15+", calls: 0, cost: 0 },
        ];

    return (
        <>
            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 32 }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                backgroundColor: isDark ? "#111" : "#fff",
                                borderRadius: 14,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                            }}
                        >
                            <BarChart3 size={24} color={isDark ? "#fff" : "#000"} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Analytics</h1>
                            <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
                                Real-time performance insights
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 18px",
                            backgroundColor: isDark ? "#111" : "#fff",
                            border: isDark ? "1px solid #222" : "1px solid #ddd",
                            borderRadius: 10,
                            color: isDark ? "#888" : "#666",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        <motion.div
                            animate={refreshing ? { rotate: 360 } : {}}
                            transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
                        >
                            <RefreshCw size={16} />
                        </motion.div>
                        Refresh
                    </button>
                </div>
            </motion.div>

            {/* Stats Grid - Row 1 */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                marginBottom: 24
            }}>
                <StatCard
                    label="Total Calls"
                    value={analytics?.total_calls_today || 0}
                    unit="Sessions"
                    icon={Phone}
                    trend="up"
                    trendValue={`${analytics?.calls_change_percent && analytics.calls_change_percent > 0 ? '+' : ''}${analytics?.calls_change_percent?.toFixed(0) || 0}%`}
                    isDark={isDark}
                    delay={0.1}
                />
                <StatCard
                    label="Hot Leads Found"
                    value={analytics?.leads_today || 0}
                    unit="Leads"
                    icon={Flame}
                    isDark={isDark}
                    delay={0.2}
                />
                <StatCard
                    label="Active Now"
                    value={analytics?.active_calls || 0}
                    icon={Zap}
                    isDark={isDark}
                    delay={0.3}
                />
            </div>

            {/* Stats Grid - Row 2 */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                marginBottom: 24
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        backgroundColor: isDark ? "#111" : "#fff",
                        borderRadius: 20,
                        padding: 24,
                        border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    }}
                >
                    <div style={{
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "JetBrains Mono, monospace"
                    }}>
                        Total Cost
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{
                            fontSize: 32,
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono, monospace",
                            color: isDark ? "#fff" : "#000"
                        }}>
                            €{(analytics?.total_cost_today || 0).toFixed(2)}
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        backgroundColor: isDark ? "#111" : "#fff",
                        borderRadius: 20,
                        padding: 24,
                        border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    }}
                >
                    <div style={{
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "JetBrains Mono, monospace"
                    }}>
                        Wallet Balance
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot status={wallet?.balance_status || "healthy"} />
                        <span style={{
                            fontSize: 32,
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono, monospace",
                            color: isDark ? "#fff" : "#000"
                        }}>
                            €{(wallet?.balance_euros || 0).toFixed(2)}
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{
                        backgroundColor: isDark ? "#111" : "#fff",
                        borderRadius: 20,
                        padding: 24,
                        border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    }}
                >
                    <div style={{
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "JetBrains Mono, monospace"
                    }}>
                        Calls Remaining
                    </div>
                    <div style={{
                        fontSize: 32,
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace",
                        color: isDark ? "#fff" : "#000"
                    }}>
                        ~{wallet?.estimated_calls_remaining || 0}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        Based on avg duration
                    </div>
                </motion.div>
            </div>

            {/* Charts - 3 columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {/* Call Volume Trend - Hourly */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    style={{
                        backgroundColor: isDark ? "#111" : "#fff",
                        borderRadius: 20,
                        padding: 24,
                        border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    }}
                >
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 24
                    }}>
                        <div>
                            <h3 style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 600,
                                marginBottom: 4
                            }}>
                                Call Volume
                            </h3>
                            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                                Activity by Hour of Day
                            </p>
                        </div>
                        <div style={{
                            padding: "6px 12px",
                            backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#666"
                        }}>
                            LIVE
                        </div>
                    </div>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData}>
                                <defs>
                                    <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isDark ? "#fff" : "#000"} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={isDark ? "#fff" : "#000"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isDark ? "#222" : "#eee"}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="hour"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#666", fontSize: 11, fontFamily: "JetBrains Mono" }}
                                    interval={3}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#666", fontSize: 11, fontFamily: "JetBrains Mono" }}
                                />
                                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                <Area
                                    type="monotone"
                                    dataKey="calls"
                                    stroke={isDark ? "#fff" : "#000"}
                                    strokeWidth={2}
                                    fill="url(#callGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Monthly Total Calls - NEW CHART */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    style={{
                        backgroundColor: isDark ? "#111" : "#fff",
                        borderRadius: 20,
                        padding: 24,
                        border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    }}
                >
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 24
                    }}>
                        <div>
                            <h3 style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 600,
                                marginBottom: 4
                            }}>
                                Total Calls
                            </h3>
                            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                                Monthly Trend (12 Months)
                            </p>
                        </div>
                        <div style={{
                            padding: "6px 12px",
                            backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#666"
                        }}>
                            {analytics?.total_calls_all_time || 0} TOTAL
                        </div>
                    </div>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} barSize={20}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isDark ? "#222" : "#eee"}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#666", fontSize: 10, fontFamily: "JetBrains Mono" }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#666", fontSize: 11, fontFamily: "JetBrains Mono" }}
                                />
                                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                <Bar
                                    dataKey="calls"
                                    fill={isDark ? "#333" : "#ddd"}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Cost Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    style={{
                        backgroundColor: isDark ? "#111" : "#fff",
                        borderRadius: 20,
                        padding: 24,
                        border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    }}
                >
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 4
                        }}>
                            Cost by Duration
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                            Call distribution by length
                        </p>
                    </div>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costData} barSize={32}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isDark ? "#222" : "#eee"}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="range"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#666", fontSize: 10, fontFamily: "JetBrains Mono" }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#666", fontSize: 10, fontFamily: "JetBrains Mono" }}
                                />
                                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                <Bar
                                    dataKey="calls"
                                    fill={isDark ? "#333" : "#ddd"}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Performance Metrics */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                style={{
                    marginTop: 20,
                    backgroundColor: isDark ? "#111" : "#fff",
                    borderRadius: 20,
                    padding: 24,
                    border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                }}
            >
                <h3 style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 20
                }}>
                    Performance Metrics
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
                    <PerformanceItem
                        label="Avg Call Duration"
                        value={`${analytics?.avg_call_duration || 0}s`}
                        isDark={isDark}
                    />
                    <PerformanceItem
                        label="Completion Rate"
                        value={`${Math.round((analytics?.success_rate || 0) * 100)}%`}
                        isDark={isDark}
                    />
                    <PerformanceItem
                        label="Cost per Call"
                        value={`€${((analytics?.total_cost_today || 0) / Math.max(analytics?.total_calls_today || 1, 1)).toFixed(2)}`}
                        isDark={isDark}
                    />
                    <PerformanceItem
                        label="Cost per Minute"
                        value={`€${((analytics?.total_cost_today || 0) / Math.max(analytics?.total_minutes_today || 1, 1)).toFixed(2)}`}
                        isDark={isDark}
                    />
                </div>
            </motion.div>
        </>
    );
}

// ============= SUB-COMPONENTS =============

function StatusDot({ status }: { status: "healthy" | "low" | "critical" | "active" }) {
    const colors = {
        healthy: "#22c55e",
        low: "#f59e0b",
        critical: "#ef4444",
        active: "#22c55e",
    };
    return (
        <span
            style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: colors[status],
                display: "inline-block",
                marginRight: 8,
                boxShadow: `0 0 8px ${colors[status]}`,
                animation: status === "active" ? "pulse 2s infinite" : "none",
            }}
        />
    );
}

function StatCard({
    label,
    value,
    unit,
    icon: Icon,
    trend,
    trendValue,
    isDark,
    delay = 0,
}: {
    label: string;
    value: string | number;
    unit?: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    trend?: "up" | "down";
    trendValue?: string;
    isDark: boolean;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            style={{
                backgroundColor: isDark ? "#111" : "#fff",
                borderRadius: 20,
                padding: 24,
                border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "JetBrains Mono, monospace"
                    }}>
                        {label}
                    </span>
                    <div style={{
                        width: 36,
                        height: 36,
                        backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        <Icon size={18} color={isDark ? "#888" : "#666"} />
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{
                        fontSize: 40,
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace",
                        letterSpacing: "-0.02em",
                        color: isDark ? "#fff" : "#000"
                    }}>
                        {value}
                    </span>
                    {unit && (
                        <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>
                            {unit}
                        </span>
                    )}
                </div>
                {trend && trendValue && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 12,
                        color: trend === "up" ? "#22c55e" : "#ef4444",
                        fontSize: 13,
                        fontWeight: 500
                    }}>
                        {trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {trendValue}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function CustomTooltip({ active, payload, label, isDark }: any) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            border: isDark ? "1px solid #333" : "1px solid #eee",
            borderRadius: 8,
            padding: "10px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
            <p style={{
                margin: 0,
                fontSize: 11,
                color: "#666",
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: 4
            }}>
                {label}
            </p>
            <p style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: isDark ? "#fff" : "#000",
                fontFamily: "JetBrains Mono, monospace"
            }}>
                {payload[0].value}
            </p>
        </div>
    );
}

function PerformanceItem({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
    return (
        <div>
            <div style={{
                fontSize: 11,
                color: "#666",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "JetBrains Mono, monospace"
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 24,
                fontWeight: 600,
                fontFamily: "JetBrains Mono, monospace",
                color: isDark ? "#fff" : "#000"
            }}>
                {value}
            </div>
        </div>
    );
}
