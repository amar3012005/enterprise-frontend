"use client";

import { User, Activity, LayoutDashboard, Phone, LogOut, BarChart3 } from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useState } from "react";

interface SideNavigationProps {
    onLogout: () => void;
}

export default function SideNavigation({ onLogout }: SideNavigationProps) {
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const agentId = params.agent_id as string;

    const navigateTo = (path: string) => {
        router.push(`/enterprise/${path}/${agentId}`);
    };

    // Determine active route
    const isActive = (route: string) => pathname?.includes(route);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'sticky',
            top: '24px'
        }}>
            <SideIconButton
                icon={<LayoutDashboard size={20} />}
                onClick={() => navigateTo('dashboard')}
                active={isActive('dashboard')}
                tooltip="Dashboard"
            />
            <SideIconButton
                icon={<BarChart3 size={20} />}
                onClick={() => navigateTo('analytics')}
                active={isActive('analytics')}
                tooltip="Analytics"
            />
            <SideIconButton
                icon={<Phone size={20} />}
                onClick={() => navigateTo('calls')}
                active={isActive('calls')}
                tooltip="Call History"
            />
            <SideIconButton
                icon={<User size={20} />}
                onClick={() => navigateTo('settings')}
                active={isActive('settings')}
                tooltip="Settings"
            />
            <div style={{ height: '100px' }} />
            <SideIconButton
                icon={<LogOut size={20} />}
                onClick={onLogout}
                tooltip="Logout"
                isLogout
            />
        </div>
    );
}

function SideIconButton({
    icon,
    active = false,
    onClick,
    tooltip,
    isLogout = false
}: {
    icon: any,
    active?: boolean,
    onClick?: () => void,
    tooltip?: string,
    isLogout?: boolean
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: active ? '#ffffff' : (isHovered ? '#f5f5f5' : 'transparent'),
                    border: active ? '1px solid #ddd' : (isHovered ? '1px solid #e5e5e5' : 'none'),
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active ? '#000' : (isHovered ? '#000' : '#666'),
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: active
                        ? '0 4px 12px rgba(0,0,0,0.08)'
                        : (isHovered ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'),
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    outline: 'none'
                }}
            >
                <div style={{
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                }}>
                    {icon}
                </div>
            </button>

            {/* Tooltip */}
            {isHovered && tooltip && (
                <div style={{
                    position: 'absolute',
                    left: '75px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    animation: 'slideIn 0.2s ease-out',
                    pointerEvents: 'none'
                }}>
                    {tooltip}
                    <div style={{
                        position: 'absolute',
                        left: '-4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderRight: '4px solid #1a1a1a'
                    }} />
                </div>
            )}

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50%) translateX(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(-50%) translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}
