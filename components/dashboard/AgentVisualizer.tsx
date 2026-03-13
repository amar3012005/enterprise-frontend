"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Network, MapPin, Calendar, CreditCard, ChevronDown } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface AgentVisualizerProps {
    agentName: string;
    agentDescription: string;
    totalCalls: number;
    location?: string;
    createdAt?: string;
    children?: React.ReactNode;
}

export default function AgentVisualizer({ agentName, agentDescription, totalCalls, location, createdAt, children }: AgentVisualizerProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Calculate days active
    const daysActive = createdAt ? Math.max(1, Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            {/* Main Visualizer Card - HUD Style */}
            <div style={{
                backgroundColor: isDark ? '#0a0a0a' : '#fff',
                borderRadius: '12px',
                padding: '0',
                flex: 1,
                minHeight: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                border: isDark ? '1px solid #111' : '1px solid #e5e5e5',
                color: isDark ? '#fff' : '#1a1a1a',
                overflow: 'hidden'
            }}>

                {/* Corner Markers - HUD Style */}
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    width: '20px',
                    height: '20px',
                    borderLeft: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderTop: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '20px',
                    height: '20px',
                    borderRight: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderTop: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    width: '20px',
                    height: '20px',
                    borderLeft: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    width: '20px',
                    height: '20px',
                    borderRight: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    pointerEvents: 'none'
                }} />

                {/* Header Overlay - Compact */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 20px',
                    zIndex: 10,
                    background: isDark
                        ? 'linear-gradient(180deg, rgba(17,17,17,0.95) 0%, rgba(17,17,17,0.7) 60%, transparent 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 60%, transparent 100%)',
                    pointerEvents: 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'auto' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <Network size={18} color={isDark ? '#fff' : '#1a1a1a'} />
                                <h1 style={{
                                    fontSize: '20px',
                                    fontWeight: 600,
                                    margin: 0,
                                    color: isDark ? '#fff' : '#1a1a1a',
                                    letterSpacing: '0.02em'
                                }}>
                                    {agentName}
                                </h1>
                            </div>
                            <p style={{
                                color: isDark ? '#666' : '#888',
                                fontSize: '12px',
                                margin: 0,
                                fontFamily: 'JetBrains Mono, monospace'
                            }}>
                                {agentDescription}
                            </p>
                        </div>

                        {/* Live Indicator - HUD Style */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.05)',
                            border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)'}`,
                            borderRadius: '4px'
                        }}>
                            <motion.div
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: '#22c55e',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 8px #22c55e'
                                }}
                            />
                            <span style={{
                                color: '#22c55e',
                                fontSize: '10px',
                                fontWeight: 600,
                                letterSpacing: '0.08em',
                                fontFamily: 'JetBrains Mono, monospace'
                            }}>
                                ACTIVE
                            </span>
                            <span style={{
                                color: isDark ? '#444' : '#aaa',
                                fontSize: '10px',
                                fontFamily: 'JetBrains Mono, monospace'
                            }}>
                                {daysActive}D
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dynamic Visualization Layer */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: children ? 'auto' : 'none' }}>
                    {children || <HiveMindCanvas isDark={isDark} />}
                </div>

                {/* Bottom Controls - HUD Style */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    display: 'flex',
                    gap: '4px',
                    zIndex: 10
                }}>
                    <TimeRangeButton label="1H" />
                    <TimeRangeButton label="24H" active />
                    <TimeRangeButton label="7D" />
                    <TimeRangeButton label="30D" />
                </div>

                {/* Side Metrics - HUD Style */}
                <div style={{
                    position: 'absolute',
                    right: '16px',
                    top: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    zIndex: 10
                }}>
                    <SideMetric label="NODES" value="284" />
                    <SideMetric label="CONN" value="1.2K" />
                    <SideMetric label="LAT" value="12ms" />
                </div>
            </div>

            {/* Bottom Info Cards - Compact HUD Style */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
            }}>
                <InfoCard
                    icon={<MapPin size={14} />}
                    label="LOCATION"
                    value={location || "Not specified"}
                />
                <InfoCard
                    icon={<Calendar size={14} />}
                    label="CALLS"
                    value={`${totalCalls.toLocaleString()}`}
                    subvalue="10:25 UTC"
                />
                <InfoCard
                    icon={<CreditCard size={14} />}
                    label="BILLING"
                    value="Enterprise"
                    subvalue="3451 **** 7896"
                />
            </div>
        </div>
    );
}

const HiveMindCanvas = ({ isDark }: { isDark: boolean }) => {
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
        const particleCount = 280;
        const centerX = width / 2;
        const centerY = height / 2;
        const clusterRadius = Math.min(width, height) * 0.42;

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
                size: Math.random() * 1.2 + 0.3,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        const animate = () => {
            const time = Date.now() * 0.001;
            ctx.clearRect(0, 0, width, height);

            // Update particle positions
            particles.forEach((p) => {
                p.baseAngle += p.rotationSpeed;
                const dynamicR = p.baseR + Math.sin(time * 0.5 + p.angleOffset) * 5;

                p.x = centerX + Math.cos(p.baseAngle) * dynamicR;
                p.y = centerY + Math.sin(p.baseAngle) * dynamicR;
                p.twinkle += 0.03;
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = 70;

                    if (distSq < maxDist * maxDist) {
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / maxDist) * (isDark ? 0.25 : 0.7);
                        ctx.beginPath();
                        ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            particles.forEach((p) => {
                const mouseDist = Math.sqrt(Math.pow(mouseRef.current.x - p.x, 2) + Math.pow(mouseRef.current.y - p.y, 2));
                const brightness = mouseDist < 120 ? 1 : 0.5 + Math.sin(p.twinkle) * 0.3;
                const nodeAlpha = isDark ? brightness : Math.max(brightness, 0.8);

                ctx.beginPath();
                ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${brightness})` : `rgba(0, 0, 0, ${nodeAlpha})`;
                ctx.arc(p.x, p.y, p.size * (mouseDist < 80 ? 1.3 : 1), 0, Math.PI * 2);
                ctx.fill();
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

function InfoCard({ icon, label, value, subvalue }: { icon: React.ReactNode, label: string, value: string, subvalue?: string }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            backgroundColor: isDark ? '#0a0a0a' : '#fff',
            borderRadius: '8px',
            padding: '12px',
            border: isDark ? '1px solid #111' : '1px solid #e5e5e5',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: isDark ? '#666' : '#888'
            }}>
                {icon}
                <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    fontFamily: 'JetBrains Mono, monospace'
                }}>
                    {label}
                </span>
            </div>
            <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: isDark ? '#fff' : '#1a1a1a',
                fontFamily: 'JetBrains Mono, monospace'
            }}>
                {value}
            </div>
            {subvalue && (
                <div style={{
                    fontSize: '10px',
                    color: isDark ? '#444' : '#aaa',
                    fontFamily: 'JetBrains Mono, monospace'
                }}>
                    {subvalue}
                </div>
            )}
        </div>
    );
}

function SideMetric({ label, value }: { label: string, value: string }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            backgroundColor: isDark ? 'rgba(10,10,10,0.8)' : 'rgba(255,255,255,0.9)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '4px',
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '60px'
        }}>
            <span style={{
                fontSize: '8px',
                color: isDark ? '#555' : '#888',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.05em'
            }}>
                {label}
            </span>
            <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: isDark ? '#fff' : '#1a1a1a',
                fontFamily: 'JetBrains Mono, monospace'
            }}>
                {value}
            </span>
        </div>
    );
}

function TimeRangeButton({ label, active = false }: { label: string, active?: boolean }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button style={{
            background: active ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : 'transparent',
            color: active ? (isDark ? '#fff' : '#1a1a1a') : (isDark ? '#666' : '#888'),
            border: active ? (isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)') : '1px solid transparent',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.05em'
        }}>
            {label}
        </button>
    );
}
