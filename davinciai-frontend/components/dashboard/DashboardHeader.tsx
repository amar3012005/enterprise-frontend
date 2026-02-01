"use client";

import { Settings, LogOut } from "lucide-react";

interface DashboardHeaderProps {
    tenantName: string;
    onLogout: () => void;
}

export default function DashboardHeader({ tenantName, onLogout }: DashboardHeaderProps) {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#000',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '20px'
                }}>Q</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <NavButton label="Rent" active />
                    <NavButton label="Buy" />
                    <NavButton label="Sell" />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    backgroundColor: '#fff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '6px', height: '6px', border: '1px solid #fff', borderRadius: '50%' }} />
                    </div>
                    Your Location: Los Angeles
                </div>
                <button
                    onClick={onLogout}
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        cursor: 'pointer'
                    }}
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}

function NavButton({ label, active = false }: { label: string, active?: boolean }) {
    return (
        <button style={{
            backgroundColor: active ? '#cccccc' : '#fff',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            {label}
        </button>
    );
}
