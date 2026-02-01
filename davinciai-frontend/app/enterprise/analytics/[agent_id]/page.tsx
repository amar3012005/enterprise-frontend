"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Clock, TrendingUp, Users, Mic, Volume2, MessageSquare, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SideNavigation from "@/components/dashboard/SideNavigation";

export default function AnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const agentId = params.agent_id as string;

    const [isMounted, setIsMounted] = useState(false);
    const [agent, setAgent] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const storedTenant = localStorage.getItem("tenant");
        if (storedTenant) {
            setTenant(JSON.parse(storedTenant));
        }

        // Mock data - replace with actual API call
        setAgent({
            agent_name: "TARA Voice Agent",
            stats: {
                total_calls: 1247,
                active_calls: 3,
                avg_call_duration: "4:32",
                success_rate: 94.2,
                total_minutes: 5623,
                avg_response_time: "1.2s",
                customer_satisfaction: 4.7,
                calls_today: 89,
                peak_hours: "2PM - 4PM",
                most_common_intent: "Product Inquiry"
            }
        });
    }, [isMounted]);

    const logout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    if (!isMounted) return null;

    return (
        <div style={{
            height: '100vh',
            backgroundColor: '#e6e6e6',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#1a1a1a',
            padding: '24px',
            overflow: 'hidden'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <DashboardHeader
                    tenantName={tenant?.organization_name || "Enterprise"}
                    onLogout={logout}
                />

                {/* Grid Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginTop: '24px' }}>

                    {/* Side Navigation */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <SideNavigation onLogout={logout} />
                    </div>

                    {/* Main Content */}
                    <div style={{ gridColumn: 'span 11' }}>
                        {/* Page Header */}
                        <div style={{ marginBottom: '16px' }}>
                            <button
                                onClick={() => router.push(`/enterprise/dashboard/${agentId}`)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#666',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    marginBottom: '8px',
                                    padding: '4px 0',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                            >
                                <ArrowLeft size={14} />
                                Back to Dashboard
                            </button>

                            <h1 style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                marginBottom: '4px'
                            }}>Voice Agent Analytics</h1>
                            <p style={{ color: '#666', fontSize: '12px' }}>
                                Performance metrics for {agent?.agent_name || agentId}
                            </p>
                        </div>

                        {/* Key Metrics Row */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '12px',
                            marginBottom: '12px'
                        }}>
                            <StatCard
                                icon={<Phone size={20} />}
                                label="Total Calls"
                                value="1,247"
                                change="+12.5%"
                                positive={true}
                            />
                            <StatCard
                                icon={<Clock size={20} />}
                                label="Avg Call Duration"
                                value="4:32"
                                change="-8.2%"
                                positive={false}
                            />
                            <StatCard
                                icon={<CheckCircle size={20} />}
                                label="Success Rate"
                                value="94.2%"
                                change="+2.1%"
                                positive={true}
                            />
                            <StatCard
                                icon={<Users size={20} />}
                                label="Active Calls"
                                value="3"
                                change="Live"
                                live={true}
                            />
                        </div>

                        {/* Charts and Details Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '12px'
                        }}>
                            {/* Total Minutes */}
                            <DetailCard
                                title="Total Minutes"
                                value="5,623"
                                subtitle="This month"
                                icon={<Volume2 size={18} />}
                            />

                            {/* Avg Response Time */}
                            <DetailCard
                                title="Avg Response Time"
                                value="1.2s"
                                subtitle="Under 2s target"
                                icon={<Mic size={18} />}
                                highlight={true}
                            />

                            {/* Customer Satisfaction */}
                            <DetailCard
                                title="Customer Satisfaction"
                                value="4.7/5.0"
                                subtitle="Based on 892 ratings"
                                icon={<MessageSquare size={18} />}
                            />
                        </div>

                        {/* Additional Insights */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            marginBottom: '12px'
                        }}>
                            {/* Calls Today */}
                            <InsightCard
                                title="Calls Today"
                                value="89"
                                description="Peak hours: 2PM - 4PM"
                                icon={<BarChart3 size={18} />}
                            />

                            {/* Most Common Intent */}
                            <InsightCard
                                title="Most Common Intent"
                                value="Product Inquiry"
                                description="42% of all calls"
                                icon={<MessageSquare size={18} />}
                            />
                        </div>

                        {/* Call Volume Chart Placeholder */}
                        <div style={{
                            backgroundColor: '#f5f5f5',
                            borderRadius: '16px',
                            padding: '16px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <h3 style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                marginBottom: '12px',
                                color: '#1a1a1a'
                            }}>Call Volume (Last 7 Days)</h3>
                            <div style={{
                                height: '120px',
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '8px',
                                padding: '8px 0'
                            }}>
                                {[65, 78, 82, 91, 88, 95, 89].map((height, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            flex: 1,
                                            height: `${height}%`,
                                            backgroundColor: i === 6 ? '#4a90e2' : '#cbd5e1',
                                            borderRadius: '8px 8px 0 0',
                                            position: 'relative',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-24px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            fontSize: '11px',
                                            color: '#666',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, change, positive, live }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: '#666'
            }}>
                {icon}
                <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </span>
            </div>
            <div style={{
                fontSize: '28px',
                fontWeight: 700,
                marginBottom: '4px',
                color: '#1a1a1a'
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '13px',
                color: live ? '#4ade80' : positive ? '#22c55e' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {!live && <TrendingUp size={14} style={{ transform: positive ? 'none' : 'rotate(180deg)' }} />}
                {live && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />}
                {change}
            </div>
        </motion.div>
    );
}

function DetailCard({ title, value, subtitle, icon, highlight }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
                backgroundColor: highlight ? '#e0f2fe' : '#f5f5f5',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: highlight ? '1px solid #bae6fd' : 'none'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: highlight ? '#0369a1' : '#666'
            }}>
                {icon}
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title}
                </span>
            </div>
            <div style={{
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '4px',
                color: highlight ? '#0c4a6e' : '#1a1a1a'
            }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                {subtitle}
            </div>
        </motion.div>
    );
}

function InsightCard({ title, value, description, icon }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: '#666'
            }}>
                {icon}
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title}
                </span>
            </div>
            <div style={{
                fontSize: '20px',
                fontWeight: 700,
                marginBottom: '4px',
                color: '#1a1a1a'
            }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                {description}
            </div>
        </motion.div>
    );
}
