"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Mic,
    Plus,
    Sparkles,
    RefreshCw,
    Paperclip,
    Globe,
    Settings,
    Folder,
} from "lucide-react";


import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";

// Derive RAG API base URL from tenant subdomain
function getRagBaseUrl(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const tenant = localStorage.getItem("tenant");
        if (!tenant) return null;
        const { subdomain } = JSON.parse(tenant);
        if (!subdomain) return null;
        return `https://rag.${subdomain}.davinciai.eu:8444`;
    } catch { return null; }
}

interface KnowledgePoint {
    id: string;
    x: number;
    y: number;
    issue: string;
    solution: string;
    issue_type: string;
    customer_segment: string;
}

interface VisualizationData {
    points: KnowledgePoint[];
    collection_name: string;
    total_points: number;
    dimension: number;
    algorithm: string;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    sources?: string[];
    confidence?: number;
}

import HiveMindRAG from "@/components/dashboard/HiveMindRAG";
import AgentSkillsModal from "@/components/dashboard/AgentSkillsModal";

export default function EnterpriseDashboardHiveMindPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { selectedAgent, loading: agentLoading } = useAgents();

    const [points, setPoints] = useState<KnowledgePoint[]>([]);
    const [vizData, setVizData] = useState<VisualizationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<KnowledgePoint | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isQuerying, setIsQuerying] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
    const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M">("1D");
    const [uptime, setUptime] = useState("~1 days");
    const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
    const [isAgentSkillMode, setIsAgentSkillMode] = useState(false);

    // Fetch visualization data from RAG API
    const loadVisualization = useCallback(async () => {
        const ragBase = getRagBaseUrl();
        if (!ragBase) {
            setConnectionStatus("disconnected");
            return;
        }
        setLoading(true);
        setConnectionStatus("connecting");

        try {
            const response = await fetch(
                `${ragBase}/api/v1/hive-mind/visualize?algorithm=tsne&limit=200`
            );

            if (response.ok) {
                const data: VisualizationData = await response.json();
                setVizData(data);
                setPoints(data.points);
                setConnectionStatus("connected");
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to load HiveMind visualization:", error);
            setConnectionStatus("disconnected");
            // Keep showing the generated neural network
        } finally {
            setLoading(false);
        }
    }, []);

    // Query the RAG system
    const handleQuery = async () => {
        if (!chatInput.trim()) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: chatInput,
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput("");
        setIsQuerying(true);

        try {
            const ragBase = getRagBaseUrl();
            if (!ragBase) throw new Error("RAG not configured");
            const response = await fetch(`${ragBase}/api/v1/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: chatInput,
                    history_context: chatMessages.slice(-6).map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: data.answer,
                    timestamp: new Date(),
                    sources: data.sources,
                    confidence: data.confidence
                };
                setChatMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error("Query failed");
            }
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: "assistant",
                content: "Unable to connect to HiveMind. The collective intelligence is temporarily unavailable.",
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsQuerying(false);
        }
    };

    // Submit agent skill directly
    // Submit agent skill directly
    const handleAgentSkillSubmit = async () => {
        if (!chatInput.trim()) return;

        setIsQuerying(true);
        try {
            const ragBase = getRagBaseUrl();
            if (!ragBase) throw new Error("RAG not configured");

            const payload = {
                text: chatInput,
                type: "agent_skill",
                topic: "general"
            };

            const response = await fetch(`${ragBase}/api/v1/skills`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const successMessage: ChatMessage = {
                    role: "assistant",
                    content: `✅ Agent skill added successfully: "${chatInput}"`,
                    timestamp: new Date()
                };
                setChatMessages(prev => [...prev, successMessage]);
                setChatInput("");
            } else {
                throw new Error("Failed to add skill");
            }
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: "assistant",
                content: "Failed to add agent skill. Please try again.",
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsQuerying(false);
        }
    };


    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        if (!storedTenant) {
            router.push("/login");
            return;
        }

        // Load visualization on mount
        loadVisualization();
    }, [router, loadVisualization]);



    if (agentLoading) {
        return (
            <div style={{
                minHeight: "100vh",
                backgroundColor: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <RefreshCw size={32} color="#333" />
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{
            height: "100%",
            width: "100%",
            backgroundColor: "#000",
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
        }}>
            {/* Header Bar */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "32px 48px",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                pointerEvents: "none"
            }}>
                {/* Left - Brand */}
                <div style={{ pointerEvents: "auto" }}>
                    <h1 style={{
                        fontSize: 48,
                        fontWeight: 800,
                        margin: 0,
                        letterSpacing: "-0.03em",
                        color: "#fff"
                    }}>
                        TARA
                    </h1>
                    <p style={{
                        fontSize: 14,
                        color: "#666",
                        margin: "4px 0 0 0",
                        fontWeight: 400
                    }}>
                        Enterprise-grade voice agent for Davinci AI
                    </p>
                </div>

                {/* Right - Status */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    pointerEvents: "auto"
                }}>
                    <motion.div
                        animate={{
                            scale: connectionStatus === "connected" ? [1, 1.2, 1] : 1,
                            opacity: connectionStatus === "connecting" ? [1, 0.5, 1] : 1
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: connectionStatus === "connected" ? "#22c55e" :
                                connectionStatus === "connecting" ? "#f59e0b" : "#666",
                            boxShadow: connectionStatus === "connected" ? "0 0 12px #22c55e" : "none"
                        }}
                    />
                    <span style={{
                        color: connectionStatus === "connected" ? "#22c55e" : "#666",
                        fontSize: 14,
                        fontWeight: 500
                    }}>
                        LIVE
                    </span>
                    <span style={{ color: "#444", fontSize: 14 }}>
                        ({uptime})
                    </span>
                </div>
            </div>

            {/* Main Visualization Area */}
            <div style={{ flex: 1, position: "relative" }}>
                <HiveMindRAG
                    points={points}
                    showTooltip={true}
                    showStats={false}
                    autoLoad={true}
                />
            </div>

            {/* Bottom Controls */}
            <div style={{
                position: "absolute",
                bottom: 32,
                left: 48,
                right: 48,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                zIndex: 10
            }}>
                {/* Time Range Selector */}
                <div style={{
                    display: "flex",
                    backgroundColor: "rgba(30, 30, 30, 0.8)",
                    borderRadius: 12,
                    padding: 4,
                    backdropFilter: "blur(10px)"
                }}>
                    {(["1D", "1W", "1M"] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: timeRange === range ? "#fff" : "transparent",
                                color: timeRange === range ? "#000" : "#666",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                {vizData && (
                    <div style={{
                        display: "flex",
                        gap: 32,
                        color: "#444",
                        fontSize: 12,
                        fontFamily: "JetBrains Mono, monospace"
                    }}>
                        <div>
                            <span style={{ color: "#666" }}>{vizData.total_points}</span>
                            <span style={{ marginLeft: 6 }}>NODES</span>
                        </div>
                        <div>
                            <span style={{ color: "#666" }}>{vizData.dimension}</span>
                            <span style={{ marginLeft: 6 }}>DIMENSIONS</span>
                        </div>
                        <div>
                            <span style={{ color: "#666" }}>{vizData.algorithm?.toUpperCase()}</span>
                            <span style={{ marginLeft: 6 }}>ALGORITHM</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Interface - Bottom Center */}
            <div style={{
                position: "absolute",
                bottom: 100,
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: 600,
                padding: "0 24px",
                zIndex: 20
            }}>
                {/* Chat Messages */}
                <AnimatePresence>
                    {chatMessages.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                marginBottom: 16,
                                maxHeight: 200,
                                overflowY: "auto",
                                backgroundColor: "rgba(0, 0, 0, 0.9)",
                                borderRadius: 16,
                                border: "1px solid #222",
                                backdropFilter: "blur(20px)"
                            }}
                        >
                            {chatMessages.slice(-4).map((msg, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: "14px 18px",
                                        borderBottom: i < chatMessages.length - 1 ? "1px solid #1a1a1a" : "none"
                                    }}
                                >
                                    <div style={{
                                        fontSize: 10,
                                        color: msg.role === "assistant" ? "#22c55e" : "#666",
                                        fontFamily: "JetBrains Mono, monospace",
                                        marginBottom: 6,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em"
                                    }}>
                                        {msg.role === "user" ? "You" : "HiveMind"}
                                        {msg.confidence && (
                                            <span style={{ marginLeft: 12, color: "#444" }}>
                                                {(msg.confidence * 100).toFixed(0)}% confidence
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.5, color: "#ccc" }}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isQuerying && (
                                <div style={{
                                    padding: "14px 18px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    color: "#444"
                                }}>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <RefreshCw size={14} />
                                    </motion.div>
                                    <span style={{ fontSize: 13 }}>Querying collective intelligence...</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Input */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 24px",
                    backgroundColor: "rgba(30, 30, 30, 0.98)",
                    borderRadius: 28,
                    border: "1px solid #2a2a2a",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.6)"
                }}>
                    {/* Left Icons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                            onClick={() => setIsSkillsModalOpen(true)}
                            title="Attach file"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: "transparent",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "#888",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
                        >
                            <Paperclip size={20} />
                        </button>

                        <div style={{ width: 1, height: 20, backgroundColor: "#333" }} />

                        <button
                            title="Web search"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: "transparent",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "#888",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
                        >
                            <Globe size={20} />
                        </button>

                        <div style={{ width: 1, height: 20, backgroundColor: "#333" }} />

                        <button
                            onClick={() => setIsAgentSkillMode(!isAgentSkillMode)}
                            title="Agent Skill Mode"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: isAgentSkillMode ? "#06b6d4" : "transparent",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: isAgentSkillMode ? "#000" : "#888",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                                if (!isAgentSkillMode) e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                if (!isAgentSkillMode) e.currentTarget.style.color = "#888";
                            }}
                        >
                            <Sparkles size={20} />
                        </button>

                        <div style={{ width: 1, height: 20, backgroundColor: "#333" }} />

                        <button
                            title="Browse files"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: "transparent",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "#888",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
                        >
                            <Folder size={20} />
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder={isAgentSkillMode ? "Type agent skill here..." : "Type your message here..."}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                if (isAgentSkillMode) {
                                    handleAgentSkillSubmit();
                                } else {
                                    handleQuery();
                                }
                            }
                        }}
                        disabled={isQuerying}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            backgroundColor: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#aaa",
                            fontSize: 15,
                            fontFamily: "Inter, sans-serif"
                        }}
                    />

                    {/* Right Microphone Button */}
                    <button
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            backgroundColor: "#fff",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#000",
                            transition: "all 0.2s",
                            boxShadow: "0 2px 8px rgba(255,255,255,0.2)"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        <Mic size={20} />
                    </button>
                </div>
            </div>

            {/* Agent Skills Modal */}
            <AgentSkillsModal
                isOpen={isSkillsModalOpen}
                onClose={() => setIsSkillsModalOpen(false)}
                isDark={true}
            />
        </div>
    );
}
