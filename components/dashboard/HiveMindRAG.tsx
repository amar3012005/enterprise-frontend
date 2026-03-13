"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { Clock, Info, RefreshCw } from "lucide-react";

// Derive dynamic credentials and RAG API base URL from tenant
// Uses subdomain (simple name like "davinci", "bundb") NOT tenant_id (UUID)
function getRagCredentials() {
    if (typeof window === "undefined") return { baseUrl: null, tenantId: null, token: null };
    try {
        const tenant = localStorage.getItem("tenant");
        const token = localStorage.getItem("access_token");
        if (!tenant) return { baseUrl: null, tenantId: null, token };

        const parsedTenant = JSON.parse(tenant);
        // Use subdomain for WebSocket/API compatibility (simple name, not UUID)
        const tenantId = parsedTenant?.subdomain || parsedTenant?.tenant_id || "davinci";

        return {
            // Point everything to the Orchestrator EU Proxy (Port 8030)
            baseUrl: `https://demo.davinciai.eu:8030`,
            tenantId,
            token
        };
    } catch { return { baseUrl: null, tenantId: null, token: null }; }
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
    created_at?: string;
    // Schema fields for rich context
    doc_type?: string;
    text?: string;
    type?: string;
    topic?: string;
    severity?: string;
    filename?: string;
    doc_type_detail?: string;
    summary?: string;
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
    agentName?: string;
}

const CACHE_KEY = 'hivemind_visualization_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [newFeatureToast, setNewFeatureToast] = useState<{ visible: boolean; count: number } | null>(null);

    const points = useMemo(() => propPoints || internalPoints, [propPoints, internalPoints]);

    // Load from cache on mount
    useEffect(() => {
        setMounted(true);

        // Try to load from cache
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    setInternalPoints(data);
                    setLastUpdated(new Date(timestamp));
                    setConnectionStatus("connected");
                }
            }
        } catch (e) {
            console.warn("Failed to load from cache:", e);
        }

        // Don't pre-initialize particles here - do it in the render loop
        particlesRef.current = [];
    }, []);

    // Save to cache
    const saveToCache = useCallback((data: KnowledgePoint[]) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
            setLastUpdated(new Date());
        } catch (e) {
            console.warn("Failed to save to cache:", e);
        }
    }, []);

    // Check for recent points
    const { processedPoints, recentCount } = useMemo(() => {
        const now = new Date();
        let count = 0;
        const processed = points.map(p => {
            let isRecent = false;
            if (p.timestamp && (p.timestamp.includes("h ") || p.timestamp.includes("m ") || p.timestamp.includes("just now"))) {
                const hours = parseInt(p.timestamp);
                if (!isNaN(hours) && hours < 24) isRecent = true;
            }
            else if (p.created_at) {
                const diff = now.getTime() - new Date(p.created_at).getTime();
                if (diff < 24 * 60 * 60 * 1000) isRecent = true;
            }

            if (!p.timestamp && !p.created_at && Math.random() < 0.05) isRecent = true;

            if (isRecent) count++;
            return { ...p, isRecent };
        });
        return { processedPoints: processed, recentCount: count };
    }, [points]);

    // Trigger toast when recent points are found
    useEffect(() => {
        if (recentCount > 0 && !loading && mounted) {
            setNewFeatureToast({ visible: true, count: recentCount });
            const timer = setTimeout(() => setNewFeatureToast(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [recentCount, loading, mounted]);

    const loadVisualization = useCallback(async (forceRefresh = false) => {
        if (propPoints && !forceRefresh) return;

        const { tenantId, token } = getRagCredentials();

        setLoading(true);
        setConnectionStatus("connecting");

        try {
            // Use Next.js API proxy route to avoid CORS
            const effectiveTenantId = tenantId || 'davinci';
            const url = `/enterprise/dashboard/hivemind/api/hivemind?algorithm=tsne&limit=200&tenant_id=${effectiveTenantId}`;
            console.log("HiveMindRAG loading visualization for tenant:", effectiveTenantId);
            const response = await fetch(url, {
                headers: {
                    "Authorization": token ? `Bearer ${token}` : ""
                }
            });

            if (response.ok) {
                const data: VisualizationData = await response.json();
                const pointsWithTime = data.points.map(p => ({
                    ...p,
                    timestamp: p.timestamp || `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m ago`,
                    created_at: p.created_at || new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),
                    doc_type: p.doc_type || p.type || p.issue_type
                }));

                setInternalPoints(pointsWithTime);
                saveToCache(pointsWithTime);
                setConnectionStatus("connected");
            } else {
                const errorData = await response.json();
                console.error("HiveMindRAG visualization error:", response.status, errorData);
                throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error("Failed to load HiveMind visualization:", error);
            setConnectionStatus("disconnected");
            // Keep showing cached data or background
        } finally {
            setLoading(false);
        }
    }, [propPoints, saveToCache]);

    const handleRefresh = useCallback(() => {
        loadVisualization(true);
    }, [loadVisualization]);

    const connectWebSocket = useCallback(() => {
        if (propPoints) return;
        const { baseUrl: ragBase, tenantId, token } = getRagCredentials();
        if (!ragBase) return;
        try {
            const wsUrl = ragBase.replace(/^https?:\/\//, "wss://") +
                `/ws/hive-mind?tenant_id=${encodeURIComponent(tenantId || 'davinci')}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
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
            const time = Date.now() * 0.001;

            // Clear background
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, w, h);

            const centerX = w / 2;
            const centerY = h / 2;
            const clusterRadius = Math.min(w, h) * 0.42;

            // Initialize particles if empty
            if (particlesRef.current.length === 0) {
                const particleCount = 280;
                for (let i = 0; i < particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.pow(Math.random(), 0.7) * clusterRadius;
                    particlesRef.current.push({
                        x: centerX + Math.cos(angle) * r,
                        y: centerY + Math.sin(angle) * r,
                        baseR: r,
                        baseAngle: angle,
                        angleOffset: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.002,
                        size: Math.random() * 1.2 + 0.3,
                        twinkle: Math.random() * Math.PI * 2
                    });
                }
            }

            // Update particle positions
            particlesRef.current.forEach((p) => {
                p.baseAngle += p.rotationSpeed;
                const dynamicR = p.baseR + Math.sin(time * 0.5 + p.angleOffset) * 5;
                p.x = centerX + Math.cos(p.baseAngle) * dynamicR;
                p.y = centerY + Math.sin(p.baseAngle) * dynamicR;
                p.twinkle += 0.03;
            });

            // Map real knowledge nodes
            const realNodes = processedPoints.map((p) => {
                const rawX = (p.x + 1) / 2;
                const rawY = (p.y + 1) / 2;
                const angle = rawX * Math.PI * 2;
                const r = Math.pow(rawY, 0.7) * clusterRadius;
                return {
                    ...p,
                    x: centerX + Math.cos(angle) * r,
                    y: centerY + Math.sin(angle) * r,
                    isReal: true,
                    twinkle: Math.random() * Math.PI * 2,
                    size: 3 // Base size for real nodes
                };
            });

            const allNodes = [...particlesRef.current, ...realNodes];

            // Draw connections - EXACT white/gray lines from AgentVisualizer
            for (let i = 0; i < allNodes.length; i++) {
                const p1 = allNodes[i];
                for (let j = i + 1; j < allNodes.length; j++) {
                    const p2 = allNodes[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = 70;

                    if (distSq < maxDist * maxDist) {
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / maxDist) * 0.25;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            // Draw background particles as subtle twinkling stars
            particlesRef.current.forEach((p) => {
                const mouseDist = Math.sqrt(Math.pow(mouseRef.current.x - p.x, 2) + Math.pow(mouseRef.current.y - p.y, 2));
                const brightness = mouseDist < 120 ? 0.7 : 0.3 + Math.sin(p.twinkle) * 0.2;
                const size = p.size * (mouseDist < 80 ? 1.2 : 1);

                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw real knowledge nodes as prominent bright stars with glow
            realNodes.forEach((p) => {
                const mouseDist = Math.sqrt(Math.pow(mouseRef.current.x - p.x, 2) + Math.pow(mouseRef.current.y - p.y, 2));
                const baseBrightness = mouseDist < 120 ? 1 : 0.7 + Math.sin(p.twinkle) * 0.3;
                const pulseSize = mouseDist < 80 ? 1.5 : 1 + Math.sin(time * 2 + p.twinkle) * 0.2;
                const displaySize = Math.max(p.size, 2.5) * pulseSize;

                // Outer glow for real nodes
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, displaySize * 3);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${baseBrightness * 0.8})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${baseBrightness * 0.3})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, displaySize * 3, 0, Math.PI * 2);
                ctx.fill();

                // Core bright dot
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${baseBrightness})`;
                ctx.arc(p.x, p.y, displaySize, 0, Math.PI * 2);
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(render);
        };

        render();
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [mounted, processedPoints, hoveredPoint, compact]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        mouseRef.current = { x: mx, y: my };

        if (points.length > 0) {
            const w = rect.width, h = rect.height;
            const clusterRadius = Math.min(w, h) * 0.42;
            const centerX = w / 2;
            const centerY = h / 2;

            let closest: any = null, minDist = 20;
            processedPoints.forEach((p: any) => {
                const rawX = (p.x + 1) / 2;
                const rawY = (p.y + 1) / 2;
                const angle = rawX * Math.PI * 2;
                const r = Math.pow(rawY, 0.7) * clusterRadius;
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;
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

    // Get tooltip content based on point type
    const getTooltipContent = (point: KnowledgePoint) => {
        // Determine doc_type from schema fields or fallbacks
        const docType = point.doc_type ||
            (point.type === 'agent_skill' ? 'Agent_Skill' :
             point.type === 'agent_rule' ? 'Agent_Rule' :
             point.issue_type?.toLowerCase().includes('skill') ? 'Agent_Skill' :
             point.issue_type?.toLowerCase().includes('rule') ? 'Agent_Rule' :
             point.issue_type?.toLowerCase().includes('knowledge') ? 'General_KB' :
             'Case_Memory');

        const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
            'Agent_Skill': { label: 'AGENT SKILL', color: '#22c55e', icon: '⚡' },
            'Agent_Rule': { label: 'AGENT RULE', color: '#f59e0b', icon: '📋' },
            'General_KB': { label: 'KNOWLEDGE BASE', color: '#3b82f6', icon: '📚' },
            'Website_Map': { label: 'WEBSITE MAP', color: '#8b5cf6', icon: '🗺️' },
            'Element_Context': { label: 'ELEMENT CONTEXT', color: '#ec4899', icon: '🎯' },
            'Case_Memory': { label: 'CASE MEMORY', color: '#A63E1B', icon: '💡' },
        };

        const config = typeConfig[docType] || { label: docType.replace(/_/g, ' ').toUpperCase(), color: '#A63E1B', icon: '📄' };

        // Get display title
        const title = point.issue ||
            point.summary?.slice(0, 100) ||
            point.text?.slice(0, 100) ||
            'Knowledge Entry';

        // Get display content
        const content = point.solution ||
            point.text ||
            point.summary ||
            'No description available';

        // Build metadata array
        const metaItems: string[] = [];
        if (point.topic) metaItems.push(`Topic: ${point.topic}`);
        if (point.severity) metaItems.push(`Severity: ${point.severity}`);
        if (point.filename) metaItems.push(`File: ${point.filename}`);
        if (point.doc_type_detail && point.doc_type_detail !== 'General') metaItems.push(`Type: ${point.doc_type_detail}`);
        if (point.customer_segment) metaItems.push(`Segment: ${point.customer_segment}`);

        // Format timestamp nicely
        const formatTimestamp = (ts?: string, created?: string): string => {
            if (!ts && !created) return 'Unknown time';
            try {
                const date = created ? new Date(created) : undefined;
                if (date && !isNaN(date.getTime())) {
                    const now = new Date();
                    const diff = now.getTime() - date.getTime();
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);

                    if (minutes < 1) return 'Just now';
                    if (minutes < 60) return `${minutes}m ago`;
                    if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
                    if (days < 7) return `${days}d ago`;
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                }
                return ts || 'Unknown time';
            } catch {
                return ts || 'Unknown time';
            }
        };

        return {
            title,
            subtitle: config.label,
            subtitleColor: config.color,
            icon: config.icon,
            content,
            meta: metaItems.length > 0 ? metaItems.join(' • ') : undefined,
            formattedTime: formatTimestamp(point.timestamp, point.created_at),
            docType
        };
    };

    return (
        <div ref={containerRef} style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            minHeight: "400px",
            position: "relative",
            overflow: "hidden"
        }}>
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { mouseRef.current = { x: -1000, y: -1000 }; setHoveredPoint(null); }}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    cursor: "crosshair"
                }}
            />

            {/* Refresh Button */}
            <motion.button
                onClick={handleRefresh}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: "8px",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    zIndex: 20,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1
                }}
            >
                <motion.div
                    animate={loading ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                >
                    <RefreshCw size={14} color="#fff" />
                </motion.div>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
                    {loading ? "UPDATING..." : "REFRESH"}
                </span>
            </motion.button>

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
                            right: compact ? 24 : 140,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 20px",
                            backgroundColor: "rgba(166, 62, 27, 0.15)",
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
                <div style={{ 
                    position: "absolute", 
                    top: 20, 
                    right: 20, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    padding: "8px 16px", 
                    backgroundColor: "rgba(0,0,0,0.4)", 
                    borderRadius: "30px", 
                    backdropFilter: "blur(10px)", 
                    border: "1px solid rgba(255,255,255,0.1)", 
                    zIndex: 10 
                }}>
                    <motion.div 
                        animate={{ 
                            scale: connectionStatus === "connected" ? [1, 1.2, 1] : 1, 
                            opacity: connectionStatus === "connecting" ? [1, 0.5, 1] : 1 
                        }} 
                        transition={{ duration: 2, repeat: Infinity }} 
                        style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: "50%", 
                            backgroundColor: connectionStatus === "connected" ? "#22c55e" : connectionStatus === "connecting" ? "#f59e0b" : "#666" 
                        }} 
                    />
                    <span style={{ 
                        color: "#fff", 
                        fontSize: 11, 
                        fontWeight: 700, 
                        fontFamily: "JetBrains Mono, monospace" 
                    }}>
                        {connectionStatus.toUpperCase()}
                    </span>
                    {lastUpdated && (
                        <span style={{ 
                            color: "rgba(255,255,255,0.5)", 
                            fontSize: 10, 
                            fontFamily: "JetBrains Mono, monospace",
                            marginLeft: 4
                        }}>
                            • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            )}

            {/* Enhanced Glassmorphism Tooltip */}
            <AnimatePresence>
                {hoveredPoint && showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        style={{
                            position: "absolute",
                            bottom: compact ? 20 : 80,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: compact ? 340 : 520,
                            maxWidth: "92vw",
                            background: "rgba(20, 20, 25, 0.75)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "20px",
                            padding: "24px",
                            backdropFilter: "blur(32px)",
                            WebkitBackdropFilter: "blur(32px)",
                            boxShadow: `
                                0 8px 32px rgba(0, 0, 0, 0.4),
                                0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                                0 0 100px rgba(166, 62, 27, 0.08)
                            `,
                            zIndex: 100
                        }}
                    >
                        {(() => {
                            const content = getTooltipContent(hoveredPoint);
                            return (
                                <>
                                    {/* Header with Doc Type Badge & Timestamp */}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 16,
                                        gap: 12
                                    }}>
                                        {/* Doc Type Badge */}
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "8px 14px",
                                            backgroundColor: `${content.subtitleColor}15`,
                                            border: `1px solid ${content.subtitleColor}40`,
                                            borderRadius: "999px",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fontFamily: "JetBrains Mono, monospace",
                                            color: content.subtitleColor,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                            whiteSpace: "nowrap"
                                        }}>
                                            <span>{content.icon}</span>
                                            <span>{content.subtitle}</span>
                                        </div>

                                        {/* Timestamp */}
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            fontSize: 11,
                                            fontFamily: "JetBrains Mono, monospace",
                                            color: "rgba(255,255,255,0.5)",
                                            backgroundColor: "rgba(255,255,255,0.05)",
                                            padding: "6px 12px",
                                            borderRadius: "999px",
                                            border: "1px solid rgba(255,255,255,0.08)"
                                        }}>
                                            <Clock size={12} />
                                            <span>{content.formattedTime}</span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div style={{
                                        fontSize: compact ? 18 : 22,
                                        fontWeight: 700,
                                        color: "#fff",
                                        marginBottom: 14,
                                        lineHeight: 1.35,
                                        letterSpacing: "-0.01em"
                                    }}>
                                        {content.title}
                                    </div>

                                    {/* Content */}
                                    <div style={{
                                        fontSize: compact ? 13 : 15,
                                        color: "rgba(255,255,255,0.75)",
                                        lineHeight: 1.55,
                                        maxHeight: "140px",
                                        overflow: "auto",
                                        paddingRight: 8
                                    }}>
                                        {content.content}
                                    </div>

                                    {/* Metadata */}
                                    {content.meta && (
                                        <div style={{
                                            marginTop: 16,
                                            paddingTop: 16,
                                            borderTop: "1px solid rgba(255,255,255,0.1)",
                                            fontSize: 11,
                                            color: "rgba(255,255,255,0.55)",
                                            fontFamily: "JetBrains Mono, monospace",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8
                                        }}>
                                            <Info size={12} />
                                            <span>{content.meta}</span>
                                        </div>
                                    )}

                                    {/* ID footer */}
                                    <div style={{
                                        marginTop: 12,
                                        paddingTop: 12,
                                        borderTop: content.meta ? undefined : "1px solid rgba(255,255,255,0.08)",
                                        fontSize: 10,
                                        color: "rgba(255,255,255,0.35)",
                                        fontFamily: "JetBrains Mono, monospace",
                                        letterSpacing: "0.03em",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}>
                                        <span>ID: {hoveredPoint.id?.slice(0, 12)}...</span>
                                        <span style={{ textTransform: "uppercase" }}>{content.docType}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
