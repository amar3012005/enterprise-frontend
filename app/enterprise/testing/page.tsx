"use client";

import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";
import { useTheme } from "@/context/ThemeContext";

const TESTING_AGENT = {
    agent_id: "agent-testing-tara",
    agent_name: "TARA x TASK",
    agent_description: "Dedicated testing voice assistant",
    websocket_url: "http://localhost:8004/",
    voice: "anushka",
    location: "EU",
    created_at: new Date().toISOString(),
    stats: { total_calls: 0, total_minutes: 0, success_rate: 100 },
};

export default function EnterpriseTestingPage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <main style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(12px, 3vw, 28px)",
            background: isDark
                ? "radial-gradient(circle at 20% 10%, #1b1b1b 0%, #0a0a0a 55%, #000 100%)"
                : "radial-gradient(circle at 20% 10%, #f7fbff 0%, #eef2f5 60%, #e8edf2 100%)"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "430px",
                borderRadius: "40px",
                padding: "10px",
                background: isDark
                    ? "linear-gradient(180deg, #1a1a1a 0%, #090909 100%)"
                    : "linear-gradient(180deg, #ffffff 0%, #f3f6f9 100%)",
                border: isDark ? "1px solid #2a2a2a" : "1px solid #dce3ea",
                boxShadow: isDark
                    ? "0 20px 60px rgba(0,0,0,0.65)"
                    : "0 20px 60px rgba(15, 23, 42, 0.15)"
            }}>
                <AIAssistantPanel
                    agentId={TESTING_AGENT.agent_id}
                    fallbackAgent={TESTING_AGENT}
                    layoutMode="phone"
                />
            </div>
        </main>
    );
}
