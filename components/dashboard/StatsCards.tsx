"use client";

import { useTheme } from "@/context/ThemeContext";

interface StatsCardsProps {
    totalCalls: number;
    successRate: number;
}

export default function StatsCards({ totalCalls, successRate }: StatsCardsProps) {
    return (
        <div style={{
            marginTop: '24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
        }}>
            <MiniStat label="Total Volume" value={totalCalls.toLocaleString()} />
            <MiniStat label="Success Rate" value={`${(successRate * 100).toFixed(1)}%`} active />
        </div>
    );
}

function MiniStat({ label, value, active = false }: any) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            backgroundColor: isDark ? '#111' : '#fff',
            color: isDark ? '#fff' : '#1a1a1a',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.05)',
            border: active ? '1px solid #10b981' : (isDark ? '1px solid #222' : '1px solid #eee'),
            transition: 'all 0.3s ease'
        }}>
            <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{value}</div>
        </div>
    );
}
