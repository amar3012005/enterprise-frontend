"use client";

import { User, LayoutDashboard, Phone, LogOut, BarChart3, Users, Network } from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

interface SideNavigationProps {
    onLogout: () => void;
    agentId?: string;
}

const ROUTES = {
    DASHBOARD: '/enterprise/dashboard',
    AGENTS: '/enterprise/dashboard/agents',
    HIVEMIND: '/enterprise/dashboard/hivemind',
    ANALYTICS: '/enterprise/dashboard/analytics',
    CALLS: '/enterprise/dashboard/calls',
    SETTINGS: '/enterprise/dashboard/settings',
} as const;

export default function SideNavigation({ onLogout, agentId: propAgentId }: SideNavigationProps) {
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const urlAgentId = params.agent_id as string;
    const agentId = propAgentId || urlAgentId;
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        if (agentId && !pathname?.startsWith(ROUTES.AGENTS) &&
            !pathname?.startsWith(ROUTES.HIVEMIND) &&
            !pathname?.startsWith(ROUTES.ANALYTICS) &&
            !pathname?.startsWith(ROUTES.CALLS) &&
            !pathname?.startsWith(ROUTES.SETTINGS)) {
        }
    }, [pathname, agentId]);

    const isActive = useCallback((route: keyof typeof ROUTES): boolean => {
        if (!pathname) return false;

        switch (route) {
            case 'DASHBOARD':
                return pathname === `${ROUTES.DASHBOARD}/${agentId}`;
            case 'AGENTS':
                return pathname === ROUTES.AGENTS;
            case 'HIVEMIND':
                return pathname === ROUTES.HIVEMIND;
            case 'ANALYTICS':
                return pathname === ROUTES.ANALYTICS;
            case 'CALLS':
                return pathname === ROUTES.CALLS;
            case 'SETTINGS':
                return pathname === ROUTES.SETTINGS;
            default:
                return false;
        }
    }, [pathname, agentId]);

    const navigateTo = useCallback((route: keyof typeof ROUTES) => {
        const targetRoute = ROUTES[route];
        if (route === 'DASHBOARD') {
            if (agentId) {
                router.push(`${ROUTES.DASHBOARD}/${agentId}`);
            } else {
                // If no agent selected, fallback to agents list or pick first available
                router.push(ROUTES.AGENTS);
            }
        } else {
            router.push(targetRoute);
        }
    }, [router, agentId]);

    const navItems = [
        { key: 'DASHBOARD' as const, icon: LayoutDashboard, label: 'Dashboard' },
        { key: 'AGENTS' as const, icon: Users, label: 'Voice Agents' },
        { key: 'HIVEMIND' as const, icon: Network, label: 'HiveMind' },
        { key: 'ANALYTICS' as const, icon: BarChart3, label: 'Analytics' },
        { key: 'CALLS' as const, icon: Phone, label: 'Call History' },
        { key: 'SETTINGS' as const, icon: User, label: 'Settings' },
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            height: '100%',
            justifyContent: 'flex-start'
        }}>
            {navItems.map(({ key, icon: Icon, label }) => (
                <SideIconButton
                    key={key}
                    icon={<Icon size={20} />}
                    onClick={() => navigateTo(key)}
                    active={isActive(key)}
                    tooltip={label}
                    isDark={isDark}
                />
            ))}
            <div style={{ flex: 1, minHeight: '50px' }} />
            <SideIconButton
                icon={<LogOut size={20} />}
                onClick={onLogout}
                tooltip="Logout"
                isLogout
                isDark={isDark}
            />
        </div>
    );
}


function SideIconButton({
    icon,
    active = false,
    onClick,
    tooltip,
    isLogout = false,
    isDark = true
}: {
    icon: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    tooltip?: string;
    isLogout?: boolean;
    isDark?: boolean;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div style={{ position: 'relative' }} suppressHydrationWarning={true}>
            <button
                suppressHydrationWarning={true}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title={tooltip || ''}
                aria-label={tooltip || ''}
                style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: active ? (isDark ? '#ffffff' : '#000') : (isHovered ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent'),
                    border: 'none',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active ? (isDark ? '#000' : '#fff') : (isHovered ? (isDark ? '#fff' : '#000') : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)')),
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: active ? (isDark ? '0 4px 12px rgba(255,255,255,0.1)' : '0 4px 12px rgba(0,0,0,0.2)') : 'none',
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
        </div>
    );
}

export { ROUTES };
