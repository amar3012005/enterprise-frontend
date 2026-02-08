"use client";

import { useState, useEffect } from "react";
import { LogOut, Sun, Moon, Bell, Search, ChevronDown } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
    tenant?: { agent_name?: string; organization_name?: string; } | null;
    onLogout: () => void;
}

export default function DashboardHeader({ tenant, onLogout }: DashboardHeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [isMounted, setIsMounted] = useState(false);
    const [time, setTime] = useState("");
    const [user, setUser] = useState<{ full_name?: string; role?: string } | null>(null);
    const [localTenant, setLocalTenant] = useState<{ organization_name?: string } | null>(null);

    useEffect(() => {
        setIsMounted(true);
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);

        // Load user and tenant from local storage for fallback/context
        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));

        const storedTenant = localStorage.getItem("tenant");
        if (storedTenant) setLocalTenant(JSON.parse(storedTenant));

        return () => clearInterval(interval);
    }, []);

    // Display logic: Helper Prop (Agent) > Prop Org > LocalStorage Org > Default
    const displayName = (isMounted && tenant?.agent_name) ||
        (isMounted && (tenant?.organization_name || localTenant?.organization_name)) ||
        "DaVinci AI";

    const userName = (isMounted && user?.full_name) || "Admin";

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0',
            // Removed marginBottom to fix layout spacing
        }}>
            {/* Left Side - Brand & Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        backgroundColor: isDark ? '#fff' : '#000',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Geometric Logo */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 2L2 7L12 12L22 7L12 2Z"
                                stroke={isDark ? '#000' : '#fff'}
                                strokeWidth="1.5"
                                fill="none"
                            />
                            <path
                                d="M2 17L12 22L22 17"
                                stroke={isDark ? '#000' : '#fff'}
                                strokeWidth="1.5"
                                fill="none"
                            />
                            <path
                                d="M2 12L12 17L22 12"
                                stroke={isDark ? '#000' : '#fff'}
                                strokeWidth="1.5"
                                fill="none"
                            />
                        </svg>
                    </div>
                    <div>
                        <span style={{
                            fontWeight: 700,
                            fontSize: '18px',
                            color: isDark ? '#fff' : '#1a1a1a',
                            letterSpacing: '-0.02em'
                        }}>
                            {displayName}
                        </span>
                        <div style={{
                            fontSize: '11px',
                            color: '#666',
                            fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.02em',
                            marginTop: '2px'
                        }}>
                            ENTERPRISE DASHBOARD
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div style={{
                    width: '1px',
                    height: '32px',
                    backgroundColor: isDark ? '#222' : '#ddd'
                }} />

                {/* Status Indicator */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    backgroundColor: isDark ? '#111' : '#fff',
                    borderRadius: '10px',
                    border: isDark ? '1px solid #1a1a1a' : '1px solid #eee'
                }}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#22c55e',
                            borderRadius: '50%',
                            boxShadow: '0 0 8px #22c55e'
                        }}
                    />
                    <span style={{
                        fontSize: '12px',
                        color: isDark ? '#888' : '#666',
                        fontFamily: 'JetBrains Mono, monospace'
                    }}>
                        SYSTEM_ONLINE
                    </span>
                </div>
            </div>

            {/* Right Side - Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Time Display */}
                {isMounted && (
                    <div style={{
                        padding: '8px 14px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '10px',
                        border: isDark ? '1px solid #1a1a1a' : '1px solid #eee',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '13px',
                        color: isDark ? '#fff' : '#000',
                        fontWeight: 500,
                        minWidth: '60px',
                        textAlign: 'center'
                    }}>
                        {time}
                    </div>
                )}

                {/* Search Button */}
                <button
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '10px',
                        border: isDark ? '1px solid #1a1a1a' : '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isDark ? '#666' : '#888',
                        transition: 'all 0.2s ease'
                    }}
                    title="Search"
                >
                    <Search size={18} />
                </button>

                {/* Notifications */}
                <button
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '10px',
                        border: isDark ? '1px solid #1a1a1a' : '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isDark ? '#666' : '#888',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                    }}
                    title="Notifications"
                >
                    <Bell size={18} />
                    {/* Notification dot */}
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        border: isDark ? '2px solid #111' : '2px solid #fff'
                    }} />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '10px',
                        border: isDark ? '1px solid #1a1a1a' : '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isDark ? '#fff' : '#000',
                        transition: 'all 0.2s ease'
                    }}
                    title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Divider */}
                <div style={{
                    width: '1px',
                    height: '32px',
                    backgroundColor: isDark ? '#222' : '#ddd',
                    margin: '0 4px'
                }} />

                {/* User Menu */}
                <button
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 12px 6px 6px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '12px',
                        border: isDark ? '1px solid #1a1a1a' : '1px solid #eee',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: isDark ? '#222' : '#f5f5f5',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isDark ? '#fff' : '#000'
                    }}>
                        {userName.charAt(0)}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isDark ? '#fff' : '#000'
                        }}>
                            {userName}
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: '#666'
                        }}>
                            Enterprise
                        </div>
                    </div>
                    <ChevronDown size={14} color="#666" />
                </button>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '10px',
                        border: isDark ? '1px solid #1a1a1a' : '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isDark ? '#666' : '#888',
                        transition: 'all 0.2s ease'
                    }}
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
