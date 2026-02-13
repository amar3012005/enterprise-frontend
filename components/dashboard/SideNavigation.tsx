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
        <div className={`flex flex-col items-center gap-2 h-full justify-start ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
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
            <div className="flex-1 min-h-[50px]" />
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
        <div className="relative" suppressHydrationWarning={true}>
            <button
                suppressHydrationWarning={true}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                title={tooltip || ''}
                aria-label={tooltip || ''}
                className={`
                    w-[60px] h-[60px] rounded-2xl border-none flex items-center justify-center cursor-pointer
                    transition-all duration-300 ease-out outline-none
                    ${active 
                        ? (isDark 
                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(255,255,255,0.1)]' 
                            : 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                          )
                        : isHovered 
                            ? (isDark 
                                ? 'bg-[#1a1a1a] text-white scale-105' 
                                : 'bg-gray-100 text-gray-900 scale-105'
                              )
                            : (isDark 
                                ? 'bg-transparent text-gray-400' 
                                : 'bg-transparent text-gray-500'
                              )
                    }
                    ${isHovered && !active ? 'scale-105' : 'scale-100'}
                `}
                style={{
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
            >
                <div 
                    className="transition-transform duration-300 ease-out"
                    style={{
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                    }}
                >
                    {icon}
                </div>
            </button>

            {isHovered && tooltip && (
                <div className="absolute left-[75px] top-1/2 -translate-y-1/2 bg-[#1a1a1a] text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[1000] pointer-events-none">
                    {tooltip}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-[#1a1a1a]" />
                </div>
            )}
        </div>
    );
}

export { ROUTES };
