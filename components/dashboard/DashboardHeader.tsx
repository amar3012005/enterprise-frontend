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

        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));

        const storedTenant = localStorage.getItem("tenant");
        if (storedTenant) setLocalTenant(JSON.parse(storedTenant));

        return () => clearInterval(interval);
    }, []);

    const displayName = (isMounted && tenant?.agent_name) ||
        (isMounted && (tenant?.organization_name || localTenant?.organization_name)) ||
        "DaVinci AI";

    const userName = (isMounted && user?.full_name) || "Admin";

    return (
        <header className="flex justify-between items-center p-0">
            {/* Left Side - Brand & Navigation */}
            <div className="flex items-center gap-6">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-500 ${isDark ? 'bg-white' : 'bg-black'}`}>
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
                        <span className={`font-bold text-lg tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {displayName}
                        </span>
                        <div className={`text-[11px] font-mono tracking-wide mt-0.5 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            ENTERPRISE DASHBOARD
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className={`w-px h-8 transition-colors duration-300 ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`} />

                {/* Status Indicator */}
                <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-300 ${isDark ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white border-gray-200'}`}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    />
                    <span className={`text-xs font-mono transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        SYSTEM_ONLINE
                    </span>
                </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-3">
                {/* Time Display */}
                {isMounted && (
                    <div className={`px-3.5 py-2 rounded-xl border font-mono text-sm font-medium min-w-[60px] text-center transition-all duration-300 ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                        {time}
                    </div>
                )}

                {/* Search Button */}
                <button
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 hover:scale-110 ${isDark ? 'bg-[#0a0a0a] border-[#222] text-gray-400 hover:text-white hover:border-[#333]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                    title="Search"
                >
                    <Search size={18} />
                </button>

                {/* Notifications */}
                <button
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center relative transition-all duration-300 hover:scale-110 ${isDark ? 'bg-[#0a0a0a] border-[#222] text-gray-400 hover:text-white hover:border-[#333]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                    title="Notifications"
                >
                    <Bell size={18} />
                    <div className={`absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ${isDark ? 'border-2 border-[#0a0a0a]' : 'border-2 border-white'}`} />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500 hover:scale-110 hover:rotate-180 ${isDark ? 'bg-[#0a0a0a] border-[#222] text-white hover:border-[#333]' : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'}`}
                    title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Divider */}
                <div className={`w-px h-8 mx-1 transition-colors duration-300 ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`} />

                {/* User Menu */}
                <button
                    className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border transition-all duration-300 hover:scale-105 ${isDark ? 'bg-[#0a0a0a] border-[#222] hover:border-[#333]' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {userName.charAt(0)}
                    </div>
                    <div className="text-left">
                        <div className={`text-sm font-medium transition-colors duration-300 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {userName}
                        </div>
                        <div className={`text-xs transition-colors duration-300 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            Enterprise
                        </div>
                    </div>
                    <ChevronDown size={14} className={isDark ? 'text-gray-500' : 'text-gray-500'} />
                </button>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 hover:scale-110 ${isDark ? 'bg-[#0a0a0a] border-[#222] text-gray-400 hover:text-white hover:border-[#333]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
