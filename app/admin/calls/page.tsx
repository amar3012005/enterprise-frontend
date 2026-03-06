"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { PhoneCall, RefreshCw, Search } from "lucide-react";

interface CallRow {
    id: string;
    agent_id: string;
    agent_name: string;
    organization_name: string;
    start_time: string | null;
    end_time: string | null;
    duration_seconds: number;
    status: string;
    caller_id: string | null;
    ttft_ms: number | null;
    ttfc_ms: number | null;
    cost_euros: number;
    sentiment_score: number | null;
    priority_level: string;
}

export default function AdminCallsPage() {
    const [calls, setCalls] = useState<CallRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchCalls = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/api/admin/calls?limit=200");
        if (res.ok) setCalls(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchCalls(); }, [fetchCalls]);

    const filtered = calls.filter(c =>
        c.agent_name.toLowerCase().includes(search.toLowerCase()) ||
        c.organization_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.caller_id || "").toLowerCase().includes(search.toLowerCase())
    );

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-12 h-12 border-4 border-[#ff5722]/30 border-t-[#ff5722] rounded-full animate-spin" /></div>;

    return (
        <div className="p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                        <PhoneCall size={24} className="text-[#ff5722]" />
                        Call Logs
                    </h1>
                    <p className="text-[#555] text-xs mt-1 tracking-wide">public.call_logs — {calls.length} records</p>
                </div>
                <button onClick={fetchCalls} className="flex items-center gap-2 px-4 py-2 bg-[#111115] border border-[#1a1a1f] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#333] transition-all"><RefreshCw size={14} /> Refresh</button>
            </div>

            <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents, organizations, callers..." className="w-full pl-11 pr-4 py-3 bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg text-sm text-white placeholder:text-[#333] outline-none focus:border-[#ff5722]/30 transition-colors" />
            </div>

            <div className="bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="text-[10px] text-[#444] uppercase tracking-widest border-b border-[#1a1a1f]">
                                <th className="p-4">Time</th>
                                <th className="p-4">Agent</th>
                                <th className="p-4">Organization</th>
                                <th className="p-4">Caller</th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">TTFT</th>
                                <th className="p-4">TTFC</th>
                                <th className="p-4">Cost</th>
                                <th className="p-4">Priority</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-[#111115]">
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:bg-[#0d0d11] transition-colors">
                                    <td className="p-4 text-[11px] text-[#555]">{c.start_time ? new Date(c.start_time).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                                    <td className="p-4 text-xs text-white font-medium">{c.agent_name}</td>
                                    <td className="p-4 text-xs text-[#ff5722]">{c.organization_name}</td>
                                    <td className="p-4 text-[11px] text-[#555] font-mono">{c.caller_id || "—"}</td>
                                    <td className="p-4 text-xs text-[#888]">{formatDuration(c.duration_seconds)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${c.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                c.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                            }`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[11px] text-[#666]">{c.ttft_ms ? `${c.ttft_ms}ms` : "—"}</td>
                                    <td className="p-4 text-[11px] text-[#666]">{c.ttfc_ms ? `${c.ttfc_ms}ms` : "—"}</td>
                                    <td className="p-4 text-xs text-emerald-400">€{c.cost_euros.toFixed(4)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${c.priority_level === "URGENT" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                c.priority_level === "HIGH" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                    "bg-[#111115] text-[#444] border-[#1a1a1f]"
                                            }`}>
                                            {c.priority_level}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="p-12 text-center text-[#333] text-sm">No call logs found</div>
                )}
            </div>
        </div>
    );
}
