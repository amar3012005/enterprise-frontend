"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import HiveMind from "./HiveMind";


interface AgentVisualizerProps {
    agentName: string;
    agentDescription: string;
    totalCalls: number;
    location?: string;
    createdAt?: string;
}

export default function AgentVisualizer({ agentName, agentDescription, totalCalls, location, createdAt }: AgentVisualizerProps) {
    // Calculate days active
    const daysActive = createdAt ? Math.max(1, Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Main Visualizer Card */}
            <div style={{
                backgroundColor: '#000',
                borderRadius: '32px',
                padding: '48px',
                height: '600px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                color: '#fff'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '48px', fontWeight: 600, margin: '0 0 8px 0', color: '#fff' }}>{agentName}</h1>
                        <p style={{ color: '#888', fontSize: '16px', margin: 0 }}>{agentDescription}</p>
                    </div>

                    {/* Live Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#10b981',
                            borderRadius: '50%',
                            boxShadow: '0 0 8px #10b981',
                            animation: 'pulse 2s infinite'
                        }} />
                        <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>
                            LIVE <span style={{ color: '#666', fontWeight: 400 }}>(-since {daysActive} days)</span>
                        </span>
                        <style jsx>{`
                            @keyframes pulse {
                                0% { transform: scale(0.95); opacity: 0.7; }
                                50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 12px #10b981; }
                                100% { transform: scale(0.95); opacity: 0.7; }
                            }
                        `}</style>
                    </div>
                </div>

                {/* Agent Visual */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    margin: '0' // Removed vertical margin to center perfectly in remaining space
                }}>
                    <HiveMind
                        width={1000} // Wider spread
                        height={550} // Taller spread
                        nodeCount={400} // Higher density for larger area
                        connectionDistance={90} // Longer connections
                        nodeColor="rgba(255, 255, 255, 0.9)"
                        lineColor="rgba(255, 255, 255, 0.15)"
                        backgroundColor="#000"
                    />

                    {/* Time Range Controls */}
                    <div style={{
                        position: 'absolute',
                        bottom: '32px',
                        left: '32px',
                        display: 'flex',
                        gap: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        padding: '4px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <TimeRangeButton label="1D" active />
                        <TimeRangeButton label="1W" />
                        <TimeRangeButton label="1M" />
                    </div>
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

function StatusTag({ label, active = false }: { label: string, active?: boolean }) {
    return (
        <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: active ? '#10b981' : '#1a1a1a',
            border: active ? 'none' : '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#fff'
        }}>{label}</div>
    );
}

function InfoCard({ label, value, highlightedValue, cardInfo }: any) {
    return (
        <div style={{
            backgroundColor: '#111',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            border: '1px solid #222'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>{label}</span>
                <ChevronDown size={14} style={{ color: '#444' }} />
            </div>
            {highlightedValue ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#ddd' }}>{value.split(highlightedValue)[0]}</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{highlightedValue}</span>
                </div>
            ) : cardInfo ? (
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#ddd' }}>{value}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{cardInfo}</div>
                </div>
            ) : (
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ddd' }}>{value}</div>
            )}
        </div>
    );
}

function TimeRangeButton({ label, active = false }: { label: string, active?: boolean }) {
    return (
        <button style={{
            background: active ? '#fff' : 'transparent',
            color: active ? '#000' : '#888',
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


