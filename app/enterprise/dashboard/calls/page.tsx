"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Phone,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    Search,
    Filter,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";


import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";
import { apiFetch } from "@/lib/api";

interface CallLog {
    call_id: string;
    duration_display: string;
    cost_euros: number;
    status: "completed" | "failed" | "interrupted";
    start_time: string;
    sentiment_score: number;
}

// Status badge component
function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
    const getStatusConfig = (s: string) => {
        switch (s) {
            case "completed":
                return { Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Completed" };
            case "failed":
                return { Icon: XCircle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "Failed" };
            case "interrupted":
                return { Icon: AlertCircle, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Interrupted" };
            default:
                return { Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Completed" };
        }
    };

    const { Icon, color, bg, label } = getStatusConfig(status);

    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            backgroundColor: bg,
            color: color,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "JetBrains Mono, monospace"
        }}>
            <Icon size={14} />
            {label}
        </div>
    );
}

// Sentiment indicator
function SentimentIndicator({ score, isDark }: { score: number; isDark: boolean }) {
    const getSentimentConfig = (s: number) => {
        if (s >= 0.6) return { Icon: TrendingUp, color: "#22c55e" };
        if (s >= 0.4) return { Icon: Minus, color: "#888" };
        return { Icon: TrendingDown, color: "#ef4444" };
    };

    const { Icon, color } = getSentimentConfig(score);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: color,
            fontSize: 13,
            fontFamily: "JetBrains Mono, monospace"
        }}>
            <Icon size={14} />
            <span>{(score * 100).toFixed(0)}%</span>
        </div>
    );
}

export default function EnterpriseDashboardCallsPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { selectedAgent, loading: agentLoading } = useAgents();

    const [calls, setCalls] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchCalls = useCallback(async () => {
        try {
            const response = await apiFetch(
                `/api/metrics/calls${selectedAgent ? `?agent_id=${selectedAgent.agent_id}` : ""}` +
                `${selectedAgent ? "&" : "?"}limit=50`
            );

            if (response.ok) {
                const data = await response.json();
                setCalls(data);
            }
        } catch (error) {
            console.error("Failed to fetch calls:", error);
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
        fetchCalls();
    }, [router, fetchCalls]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCalls();
    };



    // Filter calls
    const filteredCalls = calls.filter(call => {
        const matchesSearch = call.call_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || call.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: calls.length,
        completed: calls.filter(c => c.status === "completed").length,
        failed: calls.filter(c => c.status === "failed").length,
        avgDuration: calls.length > 0
            ? Math.round(calls.reduce((acc, c) => {
                const [min, sec] = c.duration_display.split(":").map(Number);
                return acc + (min * 60 + sec);
            }, 0) / calls.length)
            : 0
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

    return (
        <>

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
                            <Phone size={24} color={isDark ? "#fff" : "#000"} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Call History</h1>
                            <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
                                View and manage call records
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
            </motion.div >

            {/* Quick Stats */}
            < motion.div
                initial={{ opacity: 0, y: 20 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16,
                    marginBottom: 24
                }}
            >
                <QuickStat
                    label="Total Calls"
                    value={stats.total}
                    isDark={isDark}
                />
                <QuickStat
                    label="Completed"
                    value={stats.completed}
                    color="#22c55e"
                    isDark={isDark}
                />
                <QuickStat
                    label="Failed"
                    value={stats.failed}
                    color="#ef4444"
                    isDark={isDark}
                />
                <QuickStat
                    label="Avg Duration"
                    value={`${Math.floor(stats.avgDuration / 60)}:${String(stats.avgDuration % 60).padStart(2, "0")}`}
                    isDark={isDark}
                />
            </motion.div >

            {/* Filters */}
            < motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 20
                }}
            >
                {/* Search */}
                < div style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "0 16px",
                    backgroundColor: isDark ? "#111" : "#fff",
                    border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    borderRadius: 12,
                }}>
                    <Search size={18} color="#666" />
                    <input
                        type="text"
                        placeholder="Search by call ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            padding: "14px 0",
                            backgroundColor: "transparent",
                            border: "none",
                            outline: "none",
                            color: isDark ? "#fff" : "#000",
                            fontSize: 14,
                        }}
                    />
                </div >

                {/* Status Filter */}
                < div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 16px",
                    backgroundColor: isDark ? "#111" : "#fff",
                    border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    borderRadius: 12,
                }}>
                    <Filter size={18} color="#666" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: "14px 24px 14px 0",
                            backgroundColor: "transparent",
                            border: "none",
                            outline: "none",
                            color: isDark ? "#fff" : "#000",
                            fontSize: 14,
                            cursor: "pointer",
                            appearance: "none",
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="interrupted">Interrupted</option>
                    </select>
                    <ChevronDown size={14} color="#666" style={{ marginLeft: -20 }} />
                </div >
            </motion.div >

            {/* Call List */}
            < motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                    backgroundColor: isDark ? "#111" : "#fff",
                    borderRadius: 20,
                    border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    overflow: "hidden"
                }}
            >
                {/* Table Header */}
                < div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 100px 120px 100px 80px",
                    gap: 16,
                    padding: "16px 24px",
                    borderBottom: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    backgroundColor: isDark ? "#0d0d0d" : "#fafafa"
                }}>
                    <TableHeader>Call ID</TableHeader>
                    <TableHeader>Time</TableHeader>
                    <TableHeader>Duration</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Sentiment</TableHeader>
                    <TableHeader>Cost</TableHeader>
                </div >

                {/* Table Body */}
                {
                    filteredCalls.length > 0 ? (
                        filteredCalls.map((call, index) => (
                            <motion.div
                                key={call.call_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 120px 100px 120px 100px 80px",
                                    gap: 16,
                                    padding: "16px 24px",
                                    borderBottom: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    transition: "background-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark ? "#151515" : "#f8f8f8";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                {/* Call ID */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12
                                }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        backgroundColor: isDark ? "#1a1a1a" : "#f0f0f0",
                                        borderRadius: 8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        <Phone size={16} color="#666" />
                                    </div>
                                    <span style={{
                                        fontFamily: "JetBrains Mono, monospace",
                                        fontSize: 13,
                                        color: isDark ? "#fff" : "#000"
                                    }}>
                                        {call.call_id.substring(0, 12)}...
                                    </span>
                                </div>

                                {/* Time */}
                                <div style={{
                                    fontSize: 13,
                                    color: "#666",
                                    fontFamily: "JetBrains Mono, monospace"
                                }}>
                                    {new Date(call.start_time).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false
                                    })}
                                </div>

                                {/* Duration */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontFamily: "JetBrains Mono, monospace",
                                    fontSize: 13,
                                    color: isDark ? "#fff" : "#000"
                                }}>
                                    <Clock size={14} color="#666" />
                                    {call.duration_display}
                                </div>

                                {/* Status */}
                                <StatusBadge status={call.status} isDark={isDark} />

                                {/* Sentiment */}
                                <SentimentIndicator score={call.sentiment_score} isDark={isDark} />

                                {/* Cost */}
                                <div style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: isDark ? "#fff" : "#000"
                                }}>
                                    €{call.cost_euros.toFixed(2)}
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div style={{
                            padding: 48,
                            textAlign: "center",
                            color: "#666"
                        }}>
                            <Phone size={48} color="#333" style={{ marginBottom: 16 }} />
                            <p style={{ margin: 0, fontSize: 16 }}>No calls found</p>
                            <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                                {searchQuery || statusFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "Calls will appear here once your agents start handling calls"}
                            </p>
                        </div>
                    )
                }
            </motion.div >
        </>
    );
}


function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#666",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: "JetBrains Mono, monospace"
        }}>
            {children}
        </div>
    );
}

function QuickStat({
    label,
    value,
    color,
    isDark
}: {
    label: string;
    value: string | number;
    color?: string;
    isDark: boolean;
}) {
    return (
        <div style={{
            backgroundColor: isDark ? "#111" : "#fff",
            borderRadius: 16,
            padding: 20,
            border: isDark ? "1px solid #1a1a1a" : "1px solid #eee"
        }}>
            <div style={{
                fontSize: 11,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: 8
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "JetBrains Mono, monospace",
                color: color || (isDark ? "#fff" : "#000")
            }}>
                {value}
            </div>
        </div>
    );
}
