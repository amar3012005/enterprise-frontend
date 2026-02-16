"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Network } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface AgentVisualizerProps {
    agentName: string;
    agentDescription: string;
    totalCalls: number;
    location?: string;
    createdAt?: string;
}

export default function AgentVisualizer({ agentName, agentDescription, totalCalls, location, createdAt }: AgentVisualizerProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Calculate days active
    const daysActive = createdAt ? Math.max(1, Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Main Visualizer Card */}
            <div style={{
                backgroundColor: isDark ? '#000' : '#fff',
                borderRadius: '32px',
                padding: '0',
                height: '600px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)',
                color: isDark ? '#fff' : '#1a1a1a',
                border: isDark ? 'none' : '1px solid #eee',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
            }}>
                {/* Header Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '32px 40px',
                    zIndex: 10,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                    pointerEvents: 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'auto' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <Network size={28} color="#ffffff" />
                                <h1 style={{ fontSize: '36px', fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>{agentName}</h1>
                            </div>
                            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>{agentDescription}</p>
                        </div>

                        {/* Live Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#ffffff',
                                borderRadius: '50%',
                                boxShadow: '0 0 12px rgba(255,255,255,0.5)',
                                animation: 'pulse 2s infinite'
                            }} />
                            <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>
                                HIVEMIND ACTIVE
                            </span>
                            <span style={{ color: '#666', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                                ({daysActive}d uptime)
                            </span>
                            <style jsx>{`
                                @keyframes pulse {
                                    0% { transform: scale(0.95); opacity: 0.7; }
                                    50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 16px rgba(255,255,255,0.4); }
                                    100% { transform: scale(0.95); opacity: 0.7; }
                                }
                            `}</style>
                        </div>
                    </div>
                </div>

                {/* Generative HiveMind Visualization */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <HiveMindCanvas />
                </div>

                {/* Time Range Controls */}
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '24px',
                    display: 'flex',
                    gap: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '4px',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                    zIndex: 10
                }}>
                    <TimeRangeButton label="1D" active />
                    <TimeRangeButton label="1W" />
                    <TimeRangeButton label="1M" />
                </div>
            </div>

            {/* Bottom Info Cards - Now Outside */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px'
            }}>
                <InfoCard label="My Location" value={location || "Not specified"} />
                <InfoCard label="My Dates" value={`${totalCalls} Calls`} highlightedValue="10:25 AM" />
                <InfoCard label="Payment Method" value="Credit Card" cardInfo="3451 **** **** 7896" />
            </div>
        </div>
    );
}

const HiveMindCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(null!);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const particles: any[] = [];
        const particleCount = 280; // High density for the cluster look
        const centerX = width / 2;
        const centerY = height / 2;
        const clusterRadius = Math.min(width, height) * 0.45;

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.pow(Math.random(), 0.7) * clusterRadius;

            particles.push({
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r,
                baseR: r,
                baseAngle: angle,
                angleOffset: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.002,
                driftSpeed: 0.001 + Math.random() * 0.002,
                size: Math.random() * 1.5 + 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        const animate = () => {
            const time = Date.now() * 0.001;
            ctx.clearRect(0, 0, width, height);

            // Update particle positions with structured rotational drift
            particles.forEach((p) => {
                p.baseAngle += p.rotationSpeed;
                const dynamicR = p.baseR + Math.sin(time * 0.5 + p.angleOffset) * 5;

                p.x = centerX + Math.cos(p.baseAngle) * dynamicR;
                p.y = centerY + Math.sin(p.baseAngle) * dynamicR;
                p.twinkle += 0.03;
            });

            // Draw bright connections first (underneath particles)
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = 85;

                    if (distSq < maxDist * maxDist) {
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / maxDist) * 0.35;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            particles.forEach((p) => {
                const mouseDist = Math.sqrt(Math.pow(mouseRef.current.x - p.x, 2) + Math.pow(mouseRef.current.y - p.y, 2));
                const brightness = mouseDist < 120 ? 1 : 0.6 + Math.sin(p.twinkle) * 0.4;

                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                ctx.arc(p.x, p.y, p.size * (mouseDist < 80 ? 1.5 : 1), 0, Math.PI * 2);
                ctx.fill();

                if (mouseDist < 80) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const handleResize = () => {
            width = canvas.offsetWidth;
            height = canvas.offsetHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

function InfoCard({ label, value, highlightedValue, cardInfo }: any) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            backgroundColor: isDark ? '#111' : '#fff',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            border: isDark ? '1px solid #222' : '1px solid #eee',
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>{label}</span>
                <ChevronDown size={14} style={{ color: isDark ? '#444' : '#ccc' }} />
            </div>
            {highlightedValue ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#ddd' : '#333' }}>{value.split(highlightedValue)[0]}</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{highlightedValue}</span>
                </div>
            ) : cardInfo ? (
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: isDark ? '#ddd' : '#333' }}>{value}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{cardInfo}</div>
                </div>
            ) : (
                <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#ddd' : '#333' }}>{value}</div>
            )}
        </div>
    );
}

function TimeRangeButton({ label, active = false }: { label: string, active?: boolean }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button style={{
            background: active ? (isDark ? '#fff' : '#000') : 'transparent',
            color: active ? (isDark ? '#000' : '#fff') : (isDark ? '#888' : '#666'),
            border: 'none',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        }}>
            {label}
        </button>
    );
}


