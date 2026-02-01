"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SideNavigation from "@/components/dashboard/SideNavigation";

export default function CallsPage() {
    const params = useParams();
    const agentId = params.agent_id as string;
    const [tenant, setTenant] = useState<any>(null);

    useEffect(() => {
        const storedTenant = localStorage.getItem("tenant");
        if (storedTenant) {
            setTenant(JSON.parse(storedTenant));
        }
    }, []);

    const logout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#e6e6e6',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '24px'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <DashboardHeader
                    tenantName={tenant?.organization_name || "Enterprise"}
                    onLogout={logout}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <SideNavigation onLogout={logout} />
                    </div>

                    <motion.div
                        style={{ gridColumn: 'span 11' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <div style={{
                            backgroundColor: '#fff',
                            borderRadius: '32px',
                            padding: '48px',
                            minHeight: '600px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                            >
                                <h1 style={{ fontSize: '36px', fontWeight: 600, marginBottom: '16px' }}>Call History</h1>
                                <p style={{ color: '#666', fontSize: '16px' }}>
                                    Agent ID: {agentId}
                                </p>
                                <p style={{ color: '#999', marginTop: '24px' }}>
                                    Call logs and history coming soon...
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
