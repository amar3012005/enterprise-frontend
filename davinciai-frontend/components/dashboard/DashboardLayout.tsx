"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "./DashboardHeader";
import SideNavigation from "./SideNavigation";
import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";

interface DashboardLayoutProps {
    children: ReactNode;
    agentId?: string;
    showHeader?: boolean;
    fullWidth?: boolean;
}

export default function DashboardLayout({
    children,
    agentId,
    showHeader = true,
    fullWidth = false
}: DashboardLayoutProps) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { selectedAgent } = useAgents();

    const logout = () => {
        localStorage.clear();
        router.push("/login");
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                height: "100vh",
                backgroundColor: isDark ? "#0a0a0a" : "#e6e6e6",
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: isDark ? "#fff" : "#1a1a1a",
                display: "flex",
                overflow: "hidden",
                transition: "background-color 0.3s ease, color 0.3s ease"
            }}
        >
            {/* Fixed Side Navigation */}
            <div
                style={{
                    width: 80,
                    minWidth: 80,
                    height: "100vh",
                    backgroundColor: isDark ? "#0a0a0a" : "#f0f0f0",
                    borderRight: isDark ? "1px solid #1a1a1a" : "1px solid #ddd",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 24,
                    paddingBottom: 24,
                    position: "fixed",
                    left: 0,
                    top: 0,
                    zIndex: 50
                }}
            >
                <SideNavigation onLogout={logout} agentId={agentId} />
            </div>

            {/* Main Content Area */}
            <div
                style={{
                    flex: 1,
                    marginLeft: 80,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    position: "relative"
                }}
            >
                {/* Header */}
                {showHeader && (
                    <div
                        style={{
                            flexShrink: 0,
                            padding: "16px 32px",
                            backgroundColor: isDark ? "#0a0a0a" : "#e6e6e6",
                            borderBottom: isDark ? "1px solid #1a1a1a" : "1px solid #ddd"
                        }}
                    >
                        <DashboardHeader tenant={selectedAgent} onLogout={logout} />
                    </div>
                )}

                {/* Scrollable Content */}
                <div
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: fullWidth ? 0 : "24px 32px"
                    }}
                >
                    <div
                        style={{
                            maxWidth: fullWidth ? "100%" : 1400,
                            margin: fullWidth ? 0 : "0 auto",
                            height: fullWidth ? "100%" : "auto"
                        }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
