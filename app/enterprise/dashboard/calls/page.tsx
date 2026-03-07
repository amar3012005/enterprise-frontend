"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Brain,
    AlertTriangle,
    Flame,
    MessageSquare,
    Cpu,
    Zap,
    Activity,
    FileText,
} from "lucide-react";

import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";
import { apiFetch } from "@/lib/api";

interface CallLog {
    call_id: string;
    agent_id: string;
    duration_display: string;
    duration_seconds: number;
    cost_euros: number;
    status: "completed" | "failed" | "interrupted";
    start_time: string;
    sentiment_score: number | null;
    ttft_ms: number | null;
    is_churn_risk: boolean;
    is_hot_lead: boolean;
    priority_level: string;
    agent_iq: number | null;
    avg_sentiment: number | null;
    frustration_velocity: string | null;
    correction_count: number;
    brief_context: string | null;
    total_turns: number;
    total_llm_tokens: number;
    session_type: string;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const getStatusConfig = (s: string) => {
        switch (s) {
            case "completed":
                return { Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Completed" };
            case "failed":
                return { Icon: XCircle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "Failed" };
            case "interrupted":
                return { Icon: AlertCircle, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Interrupted" };
            default:
                return { Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: s || "Completed" };
        }
    };

    const { Icon, color, bg, label } = getStatusConfig(status);

    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 8,
            backgroundColor: bg,
            color: color,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "JetBrains Mono, monospace"
        }}>
            <Icon size={13} />
            {label}
        </div>
    );
}

// Sentiment indicator
function SentimentIndicator({ score, isDark }: { score: number | null; isDark: boolean }) {
    if (score === null || score === undefined) return <span style={{ color: "#444", fontSize: 12 }}>—</span>;

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
            gap: 5,
            color: color,
            fontSize: 12,
            fontFamily: "JetBrains Mono, monospace"
        }}>
            <Icon size={13} />
            <span>{(score * 100).toFixed(0)}%</span>
        </div>
    );
}

// Frustration velocity badge
function FrustrationBadge({ velocity }: { velocity: string | null }) {
    if (!velocity) return null;
    const config: Record<string, { color: string; bg: string }> = {
        STABLE: { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
        RISING: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
        CRITICAL_DEGRADATION: { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    };
    const c = config[velocity] || config.STABLE;
    return (
        <span style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
            color: c.color,
            backgroundColor: c.bg,
            padding: "3px 8px",
            borderRadius: 6,
        }}>
            {velocity}
        </span>
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
    const [expandedId, setExpandedId] = useState<string | null>(null);

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
        const matchesSearch =
            call.call_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (call.brief_context || "").toLowerCase().includes(searchQuery.toLowerCase());
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
            : 0,
        totalTokens: calls.reduce((a, c) => a + (c.total_llm_tokens || 0), 0),
        avgIQ: calls.filter(c => c.agent_iq !== null).length > 0
            ? (calls.reduce((a, c) => a + (c.agent_iq || 0), 0) / calls.filter(c => c.agent_iq !== null).length)
            : 0,
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

    const gridCols = "minmax(180px, 1.5fr) 130px 90px 110px 90px 110px 100px 80px";

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
                                Session reports &amp; AI performance metrics
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

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                <QuickStat label="Total Calls" value={stats.total} isDark={isDark} />
                <QuickStat label="Completed" value={stats.completed} color="#22c55e" isDark={isDark} />
                <QuickStat label="Failed" value={stats.failed} color="#ef4444" isDark={isDark} />
                <QuickStat
                    label="Avg Duration"
                    value={`${Math.floor(stats.avgDuration / 60)}:${String(stats.avgDuration % 60).padStart(2, "0")}`}
                    isDark={isDark}
                />
                <QuickStat
                    label="Avg Agent IQ"
                    value={`${(stats.avgIQ * 100).toFixed(0)}%`}
                    color="#8b5cf6"
                    isDark={isDark}
                />
                <QuickStat
                    label="Total Tokens"
                    value={stats.totalTokens.toLocaleString()}
                    color="#06b6d4"
                    isDark={isDark}
                />
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 20
                }}
            >
                <div style={{
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
                        placeholder="Search by call ID or context..."
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
                </div>

                <div style={{
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
                </div>
            </motion.div>

            {/* Call List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                    backgroundColor: isDark ? "#111" : "#fff",
                    borderRadius: 20,
                    border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "calc(100vh - 340px)"
                }}
            >
                {/* Table Header */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: gridCols,
                    gap: 12,
                    padding: "14px 24px",
                    borderBottom: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                    backgroundColor: isDark ? "#0d0d0d" : "#fafafa",
                    position: "sticky",
                    top: 0,
                    zIndex: 10
                }}>
                    <TableHeader>Session</TableHeader>
                    <TableHeader>Time</TableHeader>
                    <TableHeader>Duration</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Sentiment</TableHeader>
                    <TableHeader>Signals</TableHeader>
                    <TableHeader>AI Metrics</TableHeader>
                    <TableHeader>Cost</TableHeader>
                </div>

                {/* Scrollable Body */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                    {filteredCalls.length > 0 ? (
                        filteredCalls.map((call, index) => {
                            const isExpanded = expandedId === call.call_id;
                            return (
                                <div key={call.call_id}>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={() => setExpandedId(isExpanded ? null : call.call_id)}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: gridCols,
                                            gap: 12,
                                            padding: "14px 24px",
                                            borderBottom: isExpanded ? "none" : (isDark ? "1px solid #1a1a1a" : "1px solid #eee"),
                                            alignItems: "center",
                                            cursor: "pointer",
                                            transition: "background-color 0.15s ease",
                                            backgroundColor: isExpanded ? (isDark ? "#151515" : "#f8f8f8") : "transparent",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isExpanded) e.currentTarget.style.backgroundColor = isDark ? "#151515" : "#f8f8f8";
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isExpanded) e.currentTarget.style.backgroundColor = "transparent";
                                        }}
                                    >
                                        {/* Session ID + Type */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                                                <ChevronRight size={14} color="#555" />
                                            </motion.div>
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                backgroundColor: isDark ? "#1a1a1a" : "#f0f0f0",
                                                borderRadius: 8,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}>
                                                <Phone size={14} color="#666" />
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <span style={{
                                                    fontFamily: "JetBrains Mono, monospace",
                                                    fontSize: 12,
                                                    color: isDark ? "#fff" : "#000"
                                                }}>
                                                    {call.call_id.substring(0, 12)}…
                                                </span>
                                                <span style={{
                                                    fontSize: 10,
                                                    color: "#555",
                                                    fontFamily: "JetBrains Mono, monospace",
                                                    textTransform: "uppercase",
                                                }}>
                                                    {call.session_type || "webcall"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Time with Date */}
                                        <div style={{
                                            fontSize: 12,
                                            color: "#666",
                                            fontFamily: "JetBrains Mono, monospace",
                                            display: "flex",
                                            flexDirection: "column"
                                        }}>
                                            <span style={{ color: isDark ? "#ddd" : "#333", fontWeight: 500 }}>
                                                {new Date(call.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                            <span style={{ fontSize: 10, opacity: 0.7 }}>
                                                {new Date(call.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                            </span>
                                        </div>

                                        {/* Duration */}
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 5,
                                            fontFamily: "JetBrains Mono, monospace",
                                            fontSize: 12,
                                            color: isDark ? "#fff" : "#000"
                                        }}>
                                            <Clock size={13} color="#666" />
                                            {call.duration_display}
                                        </div>

                                        {/* Status */}
                                        <StatusBadge status={call.status} />

                                        {/* Sentiment */}
                                        <SentimentIndicator score={call.sentiment_score ?? call.avg_sentiment} isDark={isDark} />

                                        {/* Signals */}
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                            {call.is_hot_lead && (
                                                <div title="Hot Lead" style={{
                                                    display: "flex", alignItems: "center", gap: 3,
                                                    padding: "2px 6px", borderRadius: 4,
                                                    backgroundColor: "rgba(255,87,34,0.1)", color: "#ff5722",
                                                    fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace"
                                                }}>
                                                    <Flame size={10} /> LEAD
                                                </div>
                                            )}
                                            {call.is_churn_risk && (
                                                <div title="Churn Risk" style={{
                                                    display: "flex", alignItems: "center", gap: 3,
                                                    padding: "2px 6px", borderRadius: 4,
                                                    backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444",
                                                    fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace"
                                                }}>
                                                    <AlertTriangle size={10} /> CHURN
                                                </div>
                                            )}
                                            {!call.is_hot_lead && !call.is_churn_risk && (
                                                <span style={{ color: "#444", fontSize: 11 }}>—</span>
                                            )}
                                        </div>

                                        {/* AI Metrics mini */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            {call.agent_iq !== null && (
                                                <div style={{
                                                    display: "flex", alignItems: "center", gap: 4,
                                                    fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                                                    color: "#8b5cf6"
                                                }}>
                                                    <Brain size={11} />
                                                    IQ {(call.agent_iq * 100).toFixed(0)}%
                                                </div>
                                            )}
                                            <div style={{
                                                fontSize: 10, fontFamily: "JetBrains Mono, monospace",
                                                color: "#555"
                                            }}>
                                                {call.total_turns || 0} turns
                                            </div>
                                        </div>

                                        {/* Cost */}
                                        <div style={{
                                            fontFamily: "JetBrains Mono, monospace",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: isDark ? "#fff" : "#000"
                                        }}>
                                            €{call.cost_euros.toFixed(2)}
                                        </div>
                                    </motion.div>

                                    {/* ===== EXPANDED DETAIL PANEL ===== */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{
                                                    overflow: "hidden",
                                                    borderBottom: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                                                }}
                                            >
                                                <div style={{
                                                    padding: "20px 24px 20px 60px",
                                                    backgroundColor: isDark ? "#0d0d0d" : "#fafafa",
                                                    display: "grid",
                                                    gridTemplateColumns: "1fr 1fr 1fr",
                                                    gap: 20,
                                                }}>
                                                    {/* Brief Context */}
                                                    {call.brief_context && (
                                                        <div style={{ gridColumn: "1 / -1" }}>
                                                            <div style={{
                                                                display: "flex", alignItems: "center", gap: 6,
                                                                fontSize: 10, color: "#666",
                                                                fontFamily: "JetBrains Mono, monospace",
                                                                textTransform: "uppercase",
                                                                letterSpacing: "0.05em",
                                                                marginBottom: 6,
                                                            }}>
                                                                <FileText size={12} /> Brief Context
                                                            </div>
                                                            <div style={{
                                                                fontSize: 13,
                                                                color: isDark ? "#ccc" : "#444",
                                                                lineHeight: 1.5,
                                                                padding: "10px 14px",
                                                                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                                                borderRadius: 10,
                                                                border: isDark ? "1px solid #1a1a1a" : "1px solid #eee",
                                                            }}>
                                                                {call.brief_context}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* AI Performance Column */}
                                                    <div>
                                                        <DetailLabel icon={Brain} label="AI Performance" />
                                                        <DetailRow label="Agent IQ" value={call.agent_iq !== null ? `${(call.agent_iq * 100).toFixed(0)}%` : "—"} />
                                                        <DetailRow label="Frustration" value={<FrustrationBadge velocity={call.frustration_velocity} />} />
                                                        <DetailRow label="Corrections" value={call.correction_count || 0} />
                                                    </div>

                                                    {/* Session Metrics Column */}
                                                    <div>
                                                        <DetailLabel icon={Activity} label="Session Metrics" />
                                                        <DetailRow label="Total Turns" value={call.total_turns || 0} />
                                                        <DetailRow label="LLM Tokens" value={(call.total_llm_tokens || 0).toLocaleString()} />
                                                        <DetailRow label="Avg TTFT" value={call.ttft_ms ? `${call.ttft_ms}ms` : "—"} />
                                                        <DetailRow label="Session Type" value={
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 700,
                                                                fontFamily: "JetBrains Mono, monospace",
                                                                color: "#06b6d4",
                                                                backgroundColor: "rgba(6,182,212,0.1)",
                                                                padding: "2px 8px", borderRadius: 4,
                                                                textTransform: "uppercase",
                                                            }}>
                                                                {call.session_type || "webcall"}
                                                            </span>
                                                        } />
                                                    </div>

                                                    {/* Business Intelligence Column */}
                                                    <div>
                                                        <DetailLabel icon={Zap} label="Business Intelligence" />
                                                        <DetailRow label="Priority" value={
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 700,
                                                                fontFamily: "JetBrains Mono, monospace",
                                                                color: ["HIGH", "URGENT"].includes(call.priority_level) ? "#ef4444" : "#666",
                                                                backgroundColor: ["HIGH", "URGENT"].includes(call.priority_level) ? "rgba(239,68,68,0.1)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                                                                padding: "2px 8px", borderRadius: 4,
                                                            }}>
                                                                {call.priority_level}
                                                            </span>
                                                        } />
                                                        <DetailRow label="Hot Lead" value={call.is_hot_lead ? "Yes" : "No"} />
                                                        <DetailRow label="Churn Risk" value={call.is_churn_risk ? "Yes" : "No"} />
                                                        <DetailRow label="Sentiment" value={
                                                            (call.sentiment_score ?? call.avg_sentiment) !== null
                                                                ? `${(((call.sentiment_score ?? call.avg_sentiment) as number) * 100).toFixed(0)}%`
                                                                : "—"
                                                        } />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{
                            padding: 48,
                            textAlign: "center",
                            color: "#666"
                        }}>
                            <Phone size={48} color="#333" style={{ marginBottom: 16 }} />
                            <p style={{ margin: 0, fontSize: 16 }}>No calls found</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
}


// ===== Sub-components =====

function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#555",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
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
            borderRadius: 14,
            padding: "16px 18px",
            border: isDark ? "1px solid #1a1a1a" : "1px solid #eee"
        }}>
            <div style={{
                fontSize: 10,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: 6
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "JetBrains Mono, monospace",
                color: color || (isDark ? "#fff" : "#000")
            }}>
                {value}
            </div>
        </div>
    );
}

function DetailLabel({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 600, color: "#888",
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
            <Icon size={13} color="#666" />
            {label}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 0",
        }}>
            <span style={{
                fontSize: 12,
                color: "#666",
                fontFamily: "JetBrains Mono, monospace",
            }}>
                {label}
            </span>
            <span style={{
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "JetBrains Mono, monospace",
                color: "#ccc",
            }}>
                {value}
            </span>
        </div>
    );
}