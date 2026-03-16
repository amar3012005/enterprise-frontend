"use client";

import { useState, useEffect } from "react";
import AIAssistantPanel from "@/components/dashboard/AIAssistantPanel";
import { useTheme } from "@/context/ThemeContext";
import { Settings2, Zap, Globe, HardDrive } from "lucide-react";

export default function EnterpriseTestingPage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // Parameters for testing
    const [port, setPort] = useState("8010");
    const [tenantId, setTenantId] = useState("davinci");
    const [lang, setLang] = useState("de");

    // Dynamic Agent Construct
    const [testingAgent, setTestingAgent] = useState({
        agent_id: "agent-demo-001", // Forces fallback usage in AIAssistantPanel
        agent_name: "TARA x DEBUG",
        agent_description: "Real-time orchestration debugger",
        websocket_url: `wss://demo.davinciai.eu:8010/ws`,
        voice: "anushka",
        language_primary: lang,
    });

    // Update agent whenever params change
    useEffect(() => {
        setTestingAgent(prev => ({
            ...prev,
            websocket_url: `wss://demo.davinciai.eu:${port}/ws`,
            language_primary: lang,
        }));
    }, [port, lang]);

    // Track tenant_id changes to localStorage so AIAssistantPanel picks it up
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const currentTenant = localStorage.getItem('tenant');
                const tenantObj = currentTenant ? JSON.parse(currentTenant) : { tenant_id: 'davinci' };
                tenantObj.subdomain = tenantId; // AIAssistantPanel checks subdomain first
                tenantObj.tenant_id = tenantId;
                localStorage.setItem('tenant', JSON.stringify(tenantObj));
            } catch (e) {
                localStorage.setItem('tenant', JSON.stringify({ tenant_id: tenantId }));
            }
        }
    }, [tenantId]);

    return (
        <main style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            background: isDark ? "#050505" : "#f8f9fa",
            gap: "32px"
        }}>
           {/* Header Area */}
           <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h1 style={{ 
                    fontSize: '24px', 
                    fontWeight: 300, 
                    color: isDark ? '#fff' : '#000',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                }}>
                    Orchestrator Sandbox
                </h1>
                <p style={{ color: '#666', fontSize: '13px' }}>Talk to Tara directly via dynamic port mapping</p>
           </div>

           <div style={{
               display: 'flex',
               flexWrap: 'wrap',
               justifyContent: 'center',
               gap: '40px',
               alignItems: 'start',
               width: '100%',
               maxWidth: '1200px'
           }}>
                {/* Config Panel */}
                <div style={{
                    backgroundColor: isDark ? '#0a0a0a' : '#fff',
                    borderRadius: '24px',
                    padding: '32px',
                    border: isDark ? '1px solid #111' : '1px solid #eee',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    width: '380px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Settings2 size={18} color={isDark ? '#444' : '#888'} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Configuration
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: '#555', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <HardDrive size={12} /> PORT MAPPING
                        </label>
                        <input 
                            type="text" 
                            value={port} 
                            onChange={(e) => setPort(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: isDark ? '#050505' : '#f5f5f5',
                                border: isDark ? '1px solid #1a1a1a' : '1px solid #ddd',
                                borderRadius: '8px',
                                color: isDark ? '#fff' : '#000',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '14px'
                            }}
                            placeholder="e.g. 8004"
                        />
                        <span style={{ fontSize: '10px', color: '#444' }}>wss://demo.davinciai.eu:[PORT]</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: '#555', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={12} /> TENANT ID
                        </label>
                        <input 
                            type="text" 
                            value={tenantId} 
                            onChange={(e) => setTenantId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: isDark ? '#050505' : '#f5f5f5',
                                border: isDark ? '1px solid #1a1a1a' : '1px solid #ddd',
                                borderRadius: '8px',
                                color: isDark ? '#fff' : '#000',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '14px'
                            }}
                            placeholder="e.g. davinci"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: '#555', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={12} /> PRIMARY LANGUAGE
                        </label>
                        <select 
                            value={lang} 
                            onChange={(e) => setLang(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: isDark ? '#050505' : '#f5f5f5',
                                border: isDark ? '1px solid #1a1a1a' : '1px solid #ddd',
                                borderRadius: '8px',
                                color: isDark ? '#fff' : '#000',
                                fontSize: '14px'
                            }}
                        >
                            <option value="de">German (DE)</option>
                            <option value="en">English (EN)</option>
                            <option value="hi">Hindi (HI)</option>
                            <option value="te">Telugu (TE)</option>
                        </select>
                    </div>

                    <div style={{ 
                        marginTop: '12px',
                        padding: '16px',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.1)',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '9px', color: '#3b82f6', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>WSS Endpoint</div>
                        <div style={{ fontSize: '11px', color: isDark ? '#aaa' : '#666', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all', lineHeight: 1.4 }}>
                            {testingAgent.websocket_url}
                        </div>
                    </div>
                </div>

                {/* Assistant Panel (HUD) */}
                <div style={{
                    width: "430px",
                    borderRadius: "40px",
                    padding: "10px",
                    background: isDark
                        ? "linear-gradient(180deg, #1a1a1a 0%, #090909 100%)"
                        : "linear-gradient(180deg, #ffffff 0%, #f3f6f9 100%)",
                    border: isDark ? "1px solid #222" : "1px solid #dce3ea",
                    boxShadow: isDark
                        ? "0 30px 70px rgba(0,0,0,0.8)"
                        : "0 30px 70px rgba(15, 23, 42, 0.1)"
                }}>
                    <AIAssistantPanel
                        key={`${port}-${lang}`} // Re-mount when critical settings change
                        agentId={testingAgent.agent_id}
                        fallbackAgent={testingAgent}
                        layoutMode="phone"
                    />
                </div>
           </div>
        </main>
    );
}

