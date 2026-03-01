"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Send, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const Orb = dynamic(
    () => import("@/components/ui/orb").then((mod) => (mod.Orb as unknown as ComponentType<Record<string, unknown>>)),
    {
    ssr: false,
    loading: () => (
        <div
            style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.06)",
            }}
        />
    ),
});

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: string;
};

const CHAT_STORAGE_KEY = "enterprise_testing_chat_history_v1";
const HIVE_WS_RECONNECT_MS = 5000;
const ORCH_BASE = "http://localhost:8004";

function getHiveWsUrl() {
    if (typeof window === "undefined") return "ws://localhost:8004/ws/hive-mind";
    const configured = ORCH_BASE;
    if (configured.startsWith("http")) {
        return configured.replace(/^http/i, "ws") + "/ws/hive-mind";
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${configured}/ws/hive-mind`;
}

export default function EnterpriseTestingChatPage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const orbTickRef = useRef<NodeJS.Timeout | null>(null);
    const orbPhaseRef = useRef(0);
    const [orbLevels, setOrbLevels] = useState({ input: 0.08, output: 0.02 });

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem(CHAT_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as ChatMessage[];
                if (Array.isArray(parsed)) {
                    setMessages(parsed.slice(-100));
                }
            }
        } catch {
            // Ignore invalid cache payload
        } finally {
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !isHydrated) return;
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    }, [isHydrated, messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, isSending]);

    useEffect(() => {
        const isActive = isSending || isStreaming;

        if (orbTickRef.current) {
            clearInterval(orbTickRef.current);
            orbTickRef.current = null;
        }

        if (!isActive) {
            setOrbLevels({ input: wsStatus === "connected" ? 0.14 : 0.08, output: 0.02 });
            return;
        }

        orbTickRef.current = setInterval(() => {
            orbPhaseRef.current += 0.24;
            const wave = (Math.sin(orbPhaseRef.current) + 1) / 2;
            if (isSending) {
                setOrbLevels({
                    input: 0.22 + wave * 0.28,
                    output: 0.18 + wave * 0.4,
                });
            } else {
                setOrbLevels({
                    input: 0.2 + wave * 0.2,
                    output: 0.35 + wave * 0.55,
                });
            }
        }, 90);

        return () => {
            if (orbTickRef.current) {
                clearInterval(orbTickRef.current);
                orbTickRef.current = null;
            }
        };
    }, [isSending, isStreaming, wsStatus]);

    const appendMessage = useCallback((role: ChatRole, content: string) => {
        const msg: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role,
            content,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, msg].slice(-100));
    }, []);

    const appendStreamingAssistantMessage = useCallback(async (fullText: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const createdAt = new Date().toISOString();
        const streamingMsg: ChatMessage = { id, role: "assistant", content: "", createdAt };
        setMessages((prev) => [...prev, streamingMsg].slice(-100));

        const words = fullText.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, content: fullText } : m))
            );
            return;
        }

        setIsStreaming(true);
        for (let i = 0; i < words.length; i += 2) {
            const chunk = words.slice(0, i + 2).join(" ");
            setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, content: chunk } : m))
            );
            await new Promise((resolve) => setTimeout(resolve, 30));
        }
        setIsStreaming(false);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;
            setWsStatus("connecting");

            try {
                const ws = new WebSocket(getHiveWsUrl());
                wsRef.current = ws;

                ws.onopen = () => {
                    if (cancelled) return;
                    setWsStatus("connected");
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data?.type === "new_knowledge" && data?.node) {
                            const domain = data.node.domain ? ` [${data.node.domain}]` : "";
                            const text = data.node.text || data.node.summary || "New knowledge added";
                            appendMessage("system", `Knowledge update${domain}: ${text}`);
                        }
                    } catch {
                        // Ignore malformed WS payloads
                    }
                };

                ws.onclose = () => {
                    if (cancelled) return;
                    setWsStatus("disconnected");
                    reconnectTimerRef.current = setTimeout(connect, HIVE_WS_RECONNECT_MS);
                };

                ws.onerror = () => {
                    if (cancelled) return;
                    setWsStatus("disconnected");
                };
            } catch {
                setWsStatus("disconnected");
                reconnectTimerRef.current = setTimeout(connect, HIVE_WS_RECONNECT_MS);
            }
        };

        connect();

        return () => {
            cancelled = true;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [appendMessage]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isSending) return;

        appendMessage("user", text);
        setInput("");
        setIsSending(true);

        try {
            const history_context = messages
                .slice(-10)
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map((m) => ({ role: m.role, content: m.content }));

            const resp = await fetch("/api/testing/hive-query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: text,
                    history_context,
                    tenant_id: "demo",
                    language: "english",
                    context: {},
                }),
            });

            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const data = await resp.json();
            const answer = data?.answer || data?.text || "No answer received.";
            await appendStreamingAssistantMessage(String(answer));
        } catch {
            appendMessage("assistant", "Could not reach HiveMind query service right now.");
        } finally {
            setIsStreaming(false);
            setIsSending(false);
        }
    }, [appendMessage, appendStreamingAssistantMessage, input, isSending, messages]);

    const orbState = useMemo(() => {
        if (isStreaming) return "talking";
        if (isSending) return "thinking";
        if (wsStatus === "connected") return "listening";
        if (wsStatus === "connecting") return "thinking";
        return null;
    }, [isSending, isStreaming, wsStatus]);

    const clearHistory = () => {
        setMessages([]);
        if (typeof window !== "undefined") {
            localStorage.removeItem(CHAT_STORAGE_KEY);
        }
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "clamp(12px, 3vw, 28px)",
                background: isDark
                    ? "radial-gradient(circle at 20% 10%, #1b1b1b 0%, #0a0a0a 55%, #000 100%)"
                    : "radial-gradient(circle at 20% 10%, #f7fbff 0%, #eef2f5 60%, #e8edf2 100%)",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "430px",
                    borderRadius: "40px",
                    padding: "10px",
                    background: isDark
                        ? "linear-gradient(180deg, #1a1a1a 0%, #090909 100%)"
                        : "linear-gradient(180deg, #ffffff 0%, #f3f6f9 100%)",
                    border: isDark ? "1px solid #2a2a2a" : "1px solid #dce3ea",
                    boxShadow: isDark
                        ? "0 20px 60px rgba(0,0,0,0.65)"
                        : "0 20px 60px rgba(15, 23, 42, 0.15)",
                }}
            >
                <section
                    style={{
                        backgroundColor: isDark ? "#000" : "#fff",
                        borderRadius: "36px",
                        padding: "clamp(14px, 3vw, 24px)",
                        height: "min(88vh, 820px)",
                        display: "flex",
                        flexDirection: "column",
                        color: isDark ? "#fff" : "#1a1a1a",
                        border: isDark ? "1px solid #222" : "1px solid #eee",
                        boxShadow: isDark ? "none" : "0 4px 20px rgba(0,0,0,0.05)",
                        position: "relative",
                    }}
                >
                    <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: wsStatus === "connected" ? "#22c55e" : wsStatus === "connecting" ? "#f59e0b" : "#ef4444" }} />
                        <button
                            onClick={clearHistory}
                            style={{
                                border: "none",
                                background: isDark ? "#141414" : "#f3f4f6",
                                color: isDark ? "#9ca3af" : "#4b5563",
                                borderRadius: 8,
                                padding: "6px 8px",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                                fontSize: 11,
                            }}
                        >
                            <Trash2 size={12} />
                            Clear
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 18 }}>
                        <div
                            style={{
                                width: 170,
                                height: 170,
                                borderRadius: "50%",
                                backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Orb
                                agentState={orbState}
                                volumeMode="manual"
                                manualInput={orbLevels.input}
                                manualOutput={orbLevels.output}
                                colors={["#CADCFC", "#A0B9D1"]}
                            />
                        </div>

                        <div style={{ textAlign: "center", marginTop: 18, marginBottom: 14 }}>
                            <div
                                style={{
                                    padding: "5px 12px",
                                    backgroundColor: isDark ? "#111" : "#f5f5f5",
                                    border: isDark ? "1px solid #333" : "1px solid #eee",
                                    display: "inline-block",
                                    marginBottom: "10px",
                                    borderRadius: "4px",
                                }}
                            >
                                <p style={{ fontSize: "9px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.25em", margin: 0 }}>DAVINCI</p>
                            </div>
                            <h3 style={{ fontSize: "22px", fontWeight: 700, color: isDark ? "#fff" : "#1a1a1a", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 6px 0" }}>
                                TARA X TASK
                            </h3>
                        </div>
                    </div>

                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "6px 2px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        {!isHydrated ? (
                            <div
                                style={{
                                    margin: "auto",
                                    textAlign: "center",
                                    color: isDark ? "#94a3b8" : "#6b7280",
                                    fontSize: 14,
                                    maxWidth: 320,
                                }}
                            >
                                Loading chat...
                            </div>
                        ) : messages.length === 0 ? (
                            <div
                                style={{
                                    margin: "auto",
                                    textAlign: "center",
                                    color: isDark ? "#94a3b8" : "#6b7280",
                                    fontSize: 13,
                                    maxWidth: 320,
                                }}
                            >
                                <Sparkles size={16} style={{ marginBottom: 8 }} />
                                <div>Message HiveMind to start chatting.</div>
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div
                                    key={m.id}
                                    style={{
                                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                        maxWidth: "92%",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        lineHeight: 1.45,
                                        fontSize: 13,
                                        backgroundColor:
                                            m.role === "user"
                                                ? isDark
                                                    ? "#ffffff"
                                                    : "#111827"
                                                : m.role === "system"
                                                    ? isDark
                                                        ? "#10263a"
                                                        : "#e9f3ff"
                                                    : isDark
                                                        ? "#161616"
                                                        : "#ffffff",
                                        color:
                                            m.role === "user"
                                                ? isDark
                                                    ? "#000"
                                                    : "#fff"
                                                : isDark
                                                    ? "#e5e7eb"
                                                    : "#111827",
                                        border:
                                            m.role === "assistant"
                                                ? isDark
                                                    ? "1px solid #262626"
                                                    : "1px solid #e5e7eb"
                                                : "none",
                                    }}
                                >
                                    {m.content}
                                </div>
                            ))
                        )}

                        {(isSending || isStreaming) && (
                            <div
                                style={{
                                    alignSelf: "flex-start",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 12,
                                    color: isDark ? "#94a3b8" : "#6b7280",
                                    padding: "6px 2px",
                                }}
                            >
                                <RefreshCw size={12} />
                                {isStreaming ? "Streaming..." : "Thinking..."}
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div style={{ marginTop: "auto", width: "100%" }}>
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 16,
                                padding: "10px 10px 10px 12px",
                                backgroundColor: isDark ? "#111111" : "#ffffff",
                                border: isDark ? "1px solid #202020" : "1px solid #e5e7eb",
                            }}
                        >
                            <textarea
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void sendMessage();
                                    }
                                }}
                                placeholder="Message HiveMind..."
                                style={{
                                    flex: 1,
                                    resize: "none",
                                    background: "transparent",
                                    border: "none",
                                    outline: "none",
                                    color: isDark ? "#e5e7eb" : "#111827",
                                    fontSize: 13,
                                    lineHeight: 1.4,
                                    maxHeight: 96,
                                }}
                            />

                            <button
                                onClick={() => void sendMessage()}
                                disabled={isSending || input.trim().length === 0}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    border: "none",
                                    cursor: isSending || input.trim().length === 0 ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: isDark ? "#f3f4f6" : "#111827",
                                    color: isDark ? "#111827" : "#ffffff",
                                    opacity: isSending || input.trim().length === 0 ? 0.45 : 1,
                                }}
                            >
                                <Send size={15} />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
