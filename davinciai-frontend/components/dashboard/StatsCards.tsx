"use client";

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
    return (
        <div style={{
            backgroundColor: active ? '#000' : '#fff',
            color: active ? '#fff' : '#000',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: active ? 'none' : '1px solid #fff'
        }}>
            <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{value}</div>
        </div>
    );
}
