"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Settings, Activity } from "lucide-react";


import { useTheme } from "@/context/ThemeContext";
import { useAgents } from "@/context/AgentContext";

export default function EnterpriseDashboardSettingsPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { loading } = useAgents();

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        if (!storedTenant) {
            router.push('/login');
        }
    }, [router]);

    if (loading) {
        return (
            <div suppressHydrationWarning={true} style={{ minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }} />
        );
    }


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: isDark ? '#111' : '#fff',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isDark ? '1px solid #222' : '1px solid #eee'
                    }}>
                        <Settings size={20} color={isDark ? '#fff' : '#000'} />
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>Settings</h1>
                </div>
                <p style={{ color: '#666', margin: 0, marginLeft: '52px' }}>Configure your voice agents and account</p>
            </div>

            <div style={{
                backgroundColor: isDark ? '#111' : '#fff',
                borderRadius: '24px',
                padding: '64px',
                textAlign: 'center',
                border: isDark ? '1px solid #222' : '1px solid #eee'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px'
                }}>
                    <Activity size={32} color={isDark ? '#666' : '#999'} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Settings Coming Soon</h3>
                <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto' }}>
                    Configure your agents, integrations, and account preferences.
                </p>
            </div>
        </motion.div>
    );

}
