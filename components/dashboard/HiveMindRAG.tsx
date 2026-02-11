"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

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

interface HiveMindRAGProps {
    width?: string | number;
    height?: string | number;
    showStats?: boolean;
    showTooltip?: boolean;
    autoLoad?: boolean;
    compact?: boolean;
    points?: KnowledgePoint[];
}

export default function HiveMindRAG({
    width = "100%",
    height = "100%",
    showStats = true,
    showTooltip = true,
    autoLoad = true,
    compact = false,
    points: propPoints
}: HiveMindRAGProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const particlesRef = useRef<any[]>([]); // Use ref to persist background across renders
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

    const points = propPoints || internalPoints;

    // Set mounted on client to prevent Hydration Error #418
    useEffect(() => {
        setMounted(true);
    }, []);

    // Brain shape boundary (organic curve)
    const isInsideBrain = useCallback((nx: number, ny: number): boolean => {
        const centerX = 0.5;
        const centerY = 0.5;
        const a = 0.42;
        const b = 0.32;

        const dx = (nx - centerX) / a;
        const dy = (ny - centerY) / b;

        const angle = Math.atan2(dy, dx);
        const irregularity = 0.08 * Math.sin(angle * 3) + 0.05 * Math.cos(angle * 5);

        return (dx * dx + dy * dy) < (1 + irregularity) * (1 + irregularity);
    }, []);

    const loadVisualization = useCallback(async () => {
        if (propPoints) return;
        const ragBase = getRagBaseUrl();
        if (!ragBase) {
            setConnectionStatus("disconnected");
            return;
        }
        setLoading(true);
        setConnectionStatus("connecting");

        try {
            const response = await fetch(`${ragBase}/api/v1/hive-mind/visualize?algorithm=tsne&limit=250`);
            if (response.ok) {
                const data: VisualizationData = await response.json();
                setInternalPoints(data.points);
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
        } catch (e) {
            console.error("WS Error:", e);
        }
    }, [loadVisualization, propPoints]);

    useEffect(() => {
        if (!mounted) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        // Generate neural particles if they don't exist
        if (particlesRef.current.length === 0) {
            for (let i = 0; i < 400; i++) {
                let x, y;
                let attempts = 0;
                do {
                    x = Math.random(); y = Math.random();
                    attempts++;
                } while (!isInsideBrain(x, y) && attempts < 100);

                if (isInsideBrain(x, y)) {
                    particlesRef.current.push({
                        x, y,
                        vx: (Math.random() - 0.5) * 0.0003,
                        vy: (Math.random() - 0.5) * 0.0003,
                        size: Math.random() * 2 + 1,
                        alpha: Math.random() * 0.5 + 0.3,
                        pulse: Math.random() * Math.PI * 2
                    });
                }
            }
        }

        const render = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
            }

            const w = rect.width;
            const h = rect.height;
            if (w <= 0 || h <= 0) {
                animationRef.current = requestAnimationFrame(render);
                return;
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            timeRef.current += 0.008;
            const time = timeRef.current;

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = isDark ? "#000000" : "#ffffff";
            ctx.fillRect(0, 0, w, h);

            // Subtle depth gradient
            const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
            grad.addColorStop(0, isDark ? "rgba(30,30,30,0.4)" : "rgba(240,240,240,0.5)");
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            const breathe = 1 + Math.sin(time * 0.5) * 0.015;
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(breathe, breathe);
            ctx.translate(-w / 2, -h / 2);

            const scale = Math.min(w, h) * (compact ? 0.8 : 0.9);
            const offsetX = (w - scale) / 2;
            const offsetY = (h - scale) / 2;

            // 1. Draw Background Generative Scaffold
            ctx.globalAlpha = points.length > 0 ? 0.35 : 0.85; // Slightly more visible
            particlesRef.current.forEach((p, i) => {
                const px = offsetX + p.x * scale;
                const py = offsetY + p.y * scale;
                const pulse = Math.sin(time * 2 + (p.pulse || i * 0.1)) * 0.3 + 0.7;
                ctx.fillStyle = isDark ? `rgba(255,255,255,${(p.alpha || 0.6) * pulse})` : `rgba(0,0,0,0.15)`;
                ctx.beginPath(); ctx.arc(px, py, p.size || 1, 0, Math.PI * 2); ctx.fill();
            });

            // 2. Draw Real Clusters
            if (points.length > 0) {
                ctx.globalAlpha = 1.0;
                points.forEach((p) => {
                    const rawX = (p.x + 1) / 2;
                    const rawY = (p.y + 1) / 2;
                    let nx = rawX, ny = rawY;
                    if (!isInsideBrain(nx, ny)) {
                        nx = 0.5 + (rawX - 0.5) * 0.8;
                        ny = 0.5 + (rawY - 0.5) * 0.8;
                    }
                    const x = offsetX + nx * scale;
                    const y = offsetY + ny * scale;
                    const isHovered = hoveredPoint && p.id === hoveredPoint.id;
                    const mDist = Math.hypot(mouseRef.current.x - x, mouseRef.current.y - y);
                    const mInf = Math.max(0, 1 - mDist / 120);

                    if (isHovered || mInf > 0.1) {
                        const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
                        g.addColorStop(0, "#A63E1B"); g.addColorStop(1, "transparent");
                        ctx.fillStyle = g; ctx.globalAlpha = 0.45;
                        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
                    }

                    ctx.fillStyle = isHovered ? "#fff" : "#A63E1B";
                    ctx.globalAlpha = isHovered ? 1.0 : (0.75 + mInf * 0.25);
                    ctx.beginPath(); ctx.arc(x, y, isHovered ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
                });
            }

            // 3. Update physics
            particlesRef.current.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (!isInsideBrain(p.x, p.y)) {
                    p.vx *= -0.5; p.vy *= -0.5;
                    p.x += (0.5 - p.x) * 0.02; p.y += (0.5 - p.y) * 0.02;
                }
                p.vx *= 0.99; p.vy *= 0.99;
            });

            ctx.restore();
            animationRef.current = requestAnimationFrame(render);
        };

        render();
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [mounted, points, isDark, hoveredPoint, compact, isInsideBrain]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (points.length > 0 && showTooltip) {
            const w = rect.width, h = rect.height, scale = Math.min(w, h) * (compact ? 0.8 : 0.9);
            const offX = (w - scale) / 2, offY = (h - scale) / 2;
            let closest: any = null, minDist = 25;
            points.forEach(p => {
                const x = offX + ((p.x + 1) / 2) * scale, y = offY + ((p.y + 1) / 2) * scale;
                const d = Math.hypot(mouseRef.current.x - x, mouseRef.current.y - y);
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

            {showStats && (
                <div style={{ position: "absolute", top: compact ? 12 : 24, right: compact ? 12 : 24, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <motion.div animate={{ scale: connectionStatus === "connected" ? [1, 1.2, 1] : 1, opacity: connectionStatus === "connecting" ? [1, 0.5, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: connectionStatus === "connected" ? "#22c55e" : connectionStatus === "connecting" ? "#f59e0b" : "#666", boxShadow: connectionStatus === "connected" ? "0 0 8px #22c55e" : "none" }} />
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>{connectionStatus.toUpperCase()}</span>
                </div>
            )}

            <AnimatePresence>
                {hoveredPoint && showTooltip && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ position: "absolute", bottom: compact ? 20 : 40, left: "50%", transform: "translateX(-50%)", width: compact ? 260 : 380, backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid #333", borderRadius: 12, padding: 16, backdropFilter: "blur(20px)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", zIndex: 100 }}>
                        <div style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{hoveredPoint.issue_type?.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: compact ? 12 : 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{hoveredPoint.issue}</div>
                        <div style={{ fontSize: compact ? 11 : 12, color: "#aaa", lineHeight: 1.4 }}>{hoveredPoint.solution?.slice(0, 150)}...</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
