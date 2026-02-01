"use client";

import { LogOut } from "lucide-react";

interface DashboardHeaderProps {
    tenantName: string;
    onLogout: () => void;
}

export default function DashboardHeader({ tenantName, onLogout }: DashboardHeaderProps) {
    return (
        <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">D</span>
                </div>
                {/* Tenant Name */}
                <div>
                    <h2 className="text-white font-semibold text-lg font-display">{tenantName}</h2>
                    <p className="text-neutral-500 text-xs">Voice Agent Platform</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    <LogOut size={16} />
                    Log Out
                </button>
            </div>
        </header>
    );
}
