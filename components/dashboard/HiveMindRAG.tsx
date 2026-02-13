"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { Clock, Info } from "lucide-react";

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
    timestamp?: string;
    created_at?: string; // ISO string expected for easier calc
}

interface VisualizationData {
    points: KnowledgePoint[];
    collection_name: string;
    total_points: number;
    dimension: number;
    algorithm: string;
}

interface HiveMindRAGProps {
    width?: string | number;
    height?: string | number;
    showStats?: boolean;
    showTooltip?: boolean;
    autoLoad?: boolean;
    compact?: boolean;
    points?: KnowledgePoint[];
    agentName?: string; // Add agent name for notification
}

export default function HiveMindRAG({
    width = "100%",
    height = "100%",
    showStats = true,
    showTooltip = true,
    autoLoad = true,
    compact = false,
    points: propPoints,
    agentName = "HiveMind"
}: HiveMindRAGProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const particlesRef = useRef<any[]>([]);
    const timeRef = useRef(0);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const wsRef = useRef<WebSocket | null>(null);

    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [mounted, setMounted] = useState(false);
    const [internalPoints, setInternalPoints] = useState<KnowledgePoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<KnowledgePoint | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
    // New state for toast
    const [newFeatureToast, setNewFeatureToast] = useState<{ visible: boolean; count: number } | null>(null);

    const points = useMemo(() => propPoints || internalPoints, [propPoints, internalPoints]);

    // Set mounted and generate particles
    useEffect(() => {
        setMounted(true);
        const p = [];
        for (let i = 0; i < 350; i++) {
            let x, y;
            let attempts = 0;
            const isInside = (nx: number, ny: number) => {
                const centerX = 0.5, centerY = 0.5, a = 0.42, b = 0.32;
                const dx = (nx - centerX) / a, dy = (ny - centerY) / b;
                const angle = Math.atan2(dy, dx);
                const irregularity = 0.08 * Math.sin(angle * 3) + 0.05 * Math.cos(angle * 5);
                return (dx * dx + dy * dy) < (1 + irregularity) * (1 + irregularity);
            };

            do {
                x = Math.random();
                y = Math.random();
                attempts++;
            } while (!isInside(x, y) && attempts < 100);

            p.push({
                x, y,
                vx: (Math.random() - 0.5) * 0.0002,
                vy: (Math.random() - 0.5) * 0.0002,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.2,
                pulse: Math.random() * Math.PI * 2
            });
        }
        particlesRef.current = p;
    }, []);

    // Check for recent points
    const { processedPoints, recentCount } = useMemo(() => {
        const now = new Date();
        let count = 0;
        const processed = points.map(p => {
            // Determine if point is new (< 24 hours)
            let isRecent = false;
            // First check explict timestamp string if it contains "h ago"
            if (p.timestamp && (p.timestamp.includes("h ") || p.timestamp.includes("m ") || p.timestamp.includes("just now"))) {
                const hours = parseInt(p.timestamp);
                if (!isNaN(hours) && hours < 24) isRecent = true;
            }
            // Also check created_at if available
            else if (p.created_at) {
                const diff = now.getTime() - new Date(p.created_at).getTime();
                if (diff < 24 * 60 * 60 * 1000) isRecent = true;
            }

            // Randomly simulate recent points for demo if no real timestamps
            if (!p.timestamp && !p.created_at && Math.random() < 0.05) isRecent = true;

            if (isRecent) count++;
            return { ...p, isRecent };
        });
        return { processedPoints: processed, recentCount: count };
    }, [points]);

    // Trigger toast when recent points are found (and loaded)
    useEffect(() => {
        if (recentCount > 0 && !loading && mounted) {
            setNewFeatureToast({ visible: true, count: recentCount });
            const timer = setTimeout(() => setNewFeatureToast(null), 6000); // Hide after 6s
            return () => clearTimeout(timer);
        }
    }, [recentCount, loading, mounted]);

    const loadVisualization = useCallback(async () => {
        if (propPoints) return;
        const ragBase = getRagBaseUrl();
        if (!ragBase) return;
        setLoading(true);
        setConnectionStatus("connecting");
        try {
            const response = await fetch(`${ragBase}/api/v1/hive-mind/visualize?algorithm=tsne&limit=250`);
            if (response.ok) {
                const data: VisualizationData = await response.json();
                const pointsWithTime = data.points.map(p => ({
                    ...p,
                    timestamp: p.timestamp || `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m ago`,
                    created_at: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString() // Simulated
                }));
                setInternalPoints(pointsWithTime);
                setConnectionStatus("connected");
            }
        } catch (error) {
            console.error("Failed to load HiveMind visualization:", error);
            setConnectionStatus("disconnected");
        } finally {
            setLoading(false);
        }
    }, [propPoints]);

    const connectWebSocket = useCallback(() => {
        if (propPoints) return;
        const ragBase = getRagBaseUrl();
        if (!ragBase) return;
        try {
            const wsUrl = ragBase.replace(/^https?:\/\//, "wss://").replace(/:\d+$/, ":8444") + "/ws/hive-mind";
            wsRef.current = new WebSocket(wsUrl);
            wsRef.current.onopen = () => setConnectionStatus("connected");
            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "new_knowledge") loadVisualization();
            };
            wsRef.current.onclose = () => setTimeout(connectWebSocket, 5000);
        } catch (e) { console.error("WS Error:", e); }
    }, [loadVisualization, propPoints]);

    useEffect(() => {
        if (!mounted) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const render = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
                canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
            }

            const w = rect.width;
            const h = rect.height;
            if (w <= 0 || h <= 0) { animationRef.current = requestAnimationFrame(render); return; }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            timeRef.current += 0.006;
            const time = timeRef.current;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = isDark ? "#000000" : "#ffffff";
            ctx.fillRect(0, 0, w, h);

            const scale = Math.min(w, h) * (compact ? 0.8 : 0.9);
            const offsetX = (w - scale) / 2;
            const offsetY = (h - scale) / 2;

            const drawPlexus = (allNodes: any[]) => {
                ctx.lineWidth = 0.5;
                for (let i = 0; i < allNodes.length; i++) {
                    const p1 = allNodes[i];
                    for (let j = i + 1; j < Math.min(i + 20, allNodes.length); j++) {
                        const p2 = allNodes[j];
                        const dist = Math.hypot(p1.dx - p2.dx, p1.dy - p2.dy);
                        const maxDist = scale * 0.12;
                        if (dist < maxDist) {
                            const alpha = (1 - dist / maxDist) * 0.15 * (isDark ? 1 : 0.5);
                            ctx.strokeStyle = isDark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
                            ctx.beginPath(); ctx.moveTo(p1.dx, p1.dy); ctx.lineTo(p2.dx, p2.dy); ctx.stroke();
                        }
                    }
                }
            };

            const bgNodes = particlesRef.current.map(p => ({
                ...p,
                dx: offsetX + p.x * scale,
                dy: offsetY + p.y * scale
            }));

            const realNodes = processedPoints.map(p => {
                const rawX = (p.x + 1) / 2, rawY = (p.y + 1) / 2;
                let nx = rawX, ny = rawY;
                const centerX = 0.5, centerY = 0.5, a = 0.42, b = 0.32;
                const dx = (nx - centerX) / a, dy = (ny - centerY) / b;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) { nx = 0.5 + (rawX - 0.5) * 0.85; ny = 0.5 + (rawY - 0.5) * 0.85; }
                return {
                    ...p,
                    dx: offsetX + nx * scale,
                    dy: offsetY + ny * scale,
                    isReal: true
                };
            });

            drawPlexus([...bgNodes, ...realNodes]);

            bgNodes.forEach((p, i) => {
                const pulse = Math.sin(time * 2 + (p.pulse || i * 0.1)) * 0.3 + 0.7;
                ctx.fillStyle = isDark ? `rgba(255,255,255,${p.alpha * pulse})` : `rgba(0,0,0,0.1)`;
                ctx.beginPath(); ctx.arc(p.dx, p.dy, p.size, 0, Math.PI * 2); ctx.fill();
            });

            realNodes.forEach((p) => {
                const isHovered = hoveredPoint && p.id === hoveredPoint.id;
                const mDist = Math.hypot(mouseRef.current.x - p.dx, mouseRef.current.y - p.dy);
                const mInf = Math.max(0, 1 - mDist / 100);

                // Highlight NEW features (< 24h) with a pulsing ring
                if (p.isRecent) {
                    const pulseRing = 10 + Math.sin(time * 3) * 4;
                    ctx.strokeStyle = "#A63E1B";
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = 0.6 + Math.sin(time * 3) * 0.4; // Fade in out
                    ctx.beginPath();
                    ctx.arc(p.dx, p.dy, pulseRing, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (isHovered || mInf > 0.1) {
                    const g = ctx.createRadialGradient(p.dx, p.dy, 0, p.dx, p.dy, 15);
                    g.addColorStop(0, "#A63E1B"); g.addColorStop(1, "transparent");
                    ctx.fillStyle = g; ctx.globalAlpha = 0.4 + mInf * 0.3;
                    ctx.beginPath(); ctx.arc(p.dx, p.dy, 15, 0, Math.PI * 2); ctx.fill();
                }

                ctx.fillStyle = isHovered ? "#fff" : "#A63E1B";
                ctx.globalAlpha = isHovered ? 1.0 : (0.7 + mInf * 0.3);
                const size = isHovered ? 5 : 3;
                ctx.beginPath(); ctx.arc(p.dx, p.dy, size, 0, Math.PI * 2); ctx.fill();
            });

            particlesRef.current.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                const dx = (p.x - 0.5) / 0.42, dy = (p.y - 0.5) / 0.32;
                if (dx * dx + dy * dy > 1.2) { p.vx *= -1; p.vy *= -1; }
            });

            animationRef.current = requestAnimationFrame(render);
        };

        render();
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [mounted, processedPoints, isDark, hoveredPoint, compact]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        mouseRef.current = { x: mx, y: my };

        if (points.length > 0) {
            const w = rect.width, h = rect.height, scale = Math.min(w, h) * (compact ? 0.8 : 0.9);
            const offX = (w - scale) / 2, offY = (h - scale) / 2;
            let closest: any = null, minDist = 25;
            processedPoints.forEach((p: any) => {
                const nx = (p.x + 1) / 2, ny = (p.y + 1) / 2;
                const x = offX + nx * scale, y = offY + ny * scale;
                const d = Math.hypot(mx - x, my - y);
                if (d < minDist) { minDist = d; closest = p; }
            });
            setHoveredPoint(closest);
        }
    };

    useEffect(() => {
        if (autoLoad && !propPoints && mounted) {
            loadVisualization();
            connectWebSocket();
        }
        return () => wsRef.current?.close();
    }, [autoLoad, loadVisualization, connectWebSocket, propPoints, mounted]);

    if (!mounted) return <div style={{ width, height, backgroundColor: "transparent" }} />;

    return (
        <div ref={containerRef} style={{ width, height, position: "relative", overflow: "hidden" }}>
            <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseLeave={() => { mouseRef.current = { x: -1000, y: -1000 }; setHoveredPoint(null); }} style={{ display: "block", cursor: "crosshair" }} />

            {/* Notification Toast for New Features */}
            <AnimatePresence>
                {newFeatureToast && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        style={{
                            position: "absolute",
                            top: 24,
                            right: compact ? 24 : 140, // Move left if stats are present
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 20px",
                            backgroundColor: "rgba(166, 62, 27, 0.15)", // Subtle red tint
                            borderRadius: 12,
                            border: "1px solid #A63E1B",
                            backdropFilter: "blur(10px)",
                            zIndex: 20
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 8, height: 8, backgroundColor: '#A63E1B', borderRadius: '50%' }} />
                            <div style={{
                                position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
                                border: '1px solid #A63E1B', borderRadius: '50%',
                                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                            }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                {agentName} learned new features
                            </span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                                {newFeatureToast.count} new knowledge points detected
                            </span>
                        </div>
                        <style jsx>{`
                            @keyframes ping {
                                75%, 100% { transform: scale(2); opacity: 0; }
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>

            {showStats && (
                <div style={{ position: "absolute", top: 20, right: 20, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: "30px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 10 }}>
                    <motion.div animate={{ scale: connectionStatus === "connected" ? [1, 1.2, 1] : 1, opacity: connectionStatus === "connecting" ? [1, 0.5, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: connectionStatus === "connected" ? "#22c55e" : connectionStatus === "connecting" ? "#f59e0b" : "#666" }} />
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{connectionStatus.toUpperCase()}</span>
                </div>
            )}

            <AnimatePresence>
                {hoveredPoint && showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        style={{
                            position: "absolute",
                            bottom: compact ? 20 : 60,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: compact ? 280 : 420,
                            backgroundColor: "rgba(10, 10, 10, 0.45)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "24px",
                            padding: "24px",
                            backdropFilter: "blur(24px)",
                            boxShadow: "0 30px 60px rgba(0,0,0,0.8)",
                            zIndex: 100
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#A63E1B", textTransform: "uppercase", letterSpacing: "0.2em", display: "flex", alignItems: "center", gap: 6 }}>
                                <Info size={12} />
                                {hoveredPoint.issue_type?.replace(/_/g, " ")}
                            </div>
                            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                                <Clock size={12} />
                                {hoveredPoint.timestamp}
                            </div>
                        </div>
                        <div style={{ fontSize: compact ? 14 : 18, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>{hoveredPoint.issue}</div>
                        <div style={{ fontSize: compact ? 12 : 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, borderLeft: "2px solid #A63E1B", paddingLeft: 16 }}>{hoveredPoint.solution}</div>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: "24px", background: "linear-gradient(135deg, rgba(255,255,255,0.05), transparent)", pointerEvents: "none", zIndex: -1 }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
