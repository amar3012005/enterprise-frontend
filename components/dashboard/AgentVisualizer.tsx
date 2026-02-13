"use client";

import { motion } from "framer-motion";
import { ChevronDown, Network } from "lucide-react";
import HiveMindRAG from "./HiveMindRAG";
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

                {/* HiveMind RAG Visualization - Full Canvas (Ambient Mode) */}
                <HiveMindRAG
                    showStats={false}
                    showTooltip={false}
                    autoLoad={false}
                    compact={false}
                />

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


