"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Database, Activity, Users, Wallet, Bot, PhoneCall, LogOut, Shield, ChevronRight } from "lucide-react";

const NAV_ITEMS = [
    { href: "/admin/database", label: "Users", icon: Users, description: "Global user management" },
    { href: "/admin/tenants", label: "Tenants", icon: Database, description: "Organization control" },
    { href: "/admin/agents", label: "Agents", icon: Bot, description: "Voice agent oversight" },
    { href: "/admin/wallets", label: "Wallets", icon: Wallet, description: "Billing & credits" },
    { href: "/admin/calls", label: "Call Logs", icon: PhoneCall, description: "Global call history" },
    { href: "/admin/analytics", label: "Analytics", icon: Activity, description: "Platform-wide metrics" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminName, setAdminName] = useState("Master Admin");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("user");
        if (stored) {
            const user = JSON.parse(stored);
            if (user.login_mode !== "admin") {
                router.push("/login");
                return;
            }
            setAdminName(user.full_name || "Master Admin");
        } else {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        router.push("/login");
    };

    if (!mounted) return null;

    return (
        <div className="flex h-screen bg-[#060608] text-white" style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace" }}>
            {/* Sidebar */}
            <aside className="w-72 border-r border-[#1a1a1f] bg-[#0a0a0e] flex flex-col shrink-0">
                {/* Header */}
                <div className="p-6 border-b border-[#1a1a1f]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff5722] to-[#ff1744] flex items-center justify-center shadow-lg shadow-[#ff5722]/20">
                            <Shield size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-widest text-white">DAVINCI</h1>
                            <p className="text-[10px] text-[#ff5722] uppercase tracking-[0.25em]">Master Control</p>
                        </div>
                    </div>
                    <div className="mt-4 px-3 py-2 rounded-md bg-[#111115] border border-[#1a1a1f]">
                        <p className="text-[10px] text-[#666] uppercase tracking-wider">Signed in as</p>
                        <p className="text-xs text-[#ccc] truncate mt-0.5">{adminName}</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <p className="text-[10px] text-[#444] uppercase tracking-widest px-3 mb-3">PostgreSQL Tables</p>
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? "bg-[#ff5722]/10 text-[#ff5722] border border-[#ff5722]/20"
                                        : "text-[#888] hover:text-white hover:bg-[#111115] border border-transparent"
                                    }`}
                            >
                                <item.icon size={16} className={isActive ? "text-[#ff5722]" : "text-[#555] group-hover:text-[#888]"} />
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium block">{item.label}</span>
                                    <span className="text-[10px] text-[#444] block truncate">{item.description}</span>
                                </div>
                                {isActive && <ChevronRight size={14} className="text-[#ff5722]/50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[#1a1a1f] space-y-2">
                    <Link
                        href="/enterprise/dashboard/agents"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#666] hover:text-white hover:bg-[#111115] transition-colors text-xs"
                    >
                        <Database size={14} />
                        <span>Enterprise View</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs"
                    >
                        <LogOut size={14} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[#060608]">
                {children}
            </main>
        </div>
    );
}
