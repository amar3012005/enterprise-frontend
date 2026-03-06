"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Bot, RefreshCw, Edit3, Save, X, Search } from "lucide-react";

interface AgentRow {
    agent_id: string;
    tenant_id: string;
    organization_name: string;
    agent_name: string;
    agent_description: string | null;
    websocket_url: string | null;
    phone_number: string | null;
    language_primary: string;
    is_active: boolean;
    cost_per_minute: number;
    created_at: string;
}

export default function AdminAgentsPage() {
    const [agents, setAgents] = useState<AgentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
    const [search, setSearch] = useState("");

    const showToast = (msg: string, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/api/admin/agents");
        if (res.ok) setAgents(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchAgents(); }, [fetchAgents]);

    const startEdit = (a: AgentRow) => {
        setEditingId(a.agent_id);
        setEditForm({
            agent_name: a.agent_name,
            websocket_url: a.websocket_url || "",
            language_primary: a.language_primary,
            is_active: a.is_active,
            cost_per_minute: a.cost_per_minute,
        });
    };

    const saveEdit = async (id: string) => {
        setSaving(true);
        const res = await apiFetch(`/api/admin/agents/${id}`, { method: "PUT", body: JSON.stringify(editForm) });
        if (res.ok) { showToast("Agent updated — DB overwritten"); setEditingId(null); fetchAgents(); }
        else showToast("Update failed", "error");
        setSaving(false);
    };

    const filtered = agents.filter(a => a.agent_name.toLowerCase().includes(search.toLowerCase()) || a.organization_name.toLowerCase().includes(search.toLowerCase()));

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-12 h-12 border-4 border-[#ff5722]/30 border-t-[#ff5722] rounded-full animate-spin" /></div>;

    return (
        <div className="p-8 lg:p-10">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium border ${toast.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{toast.msg}</div>}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                        <Bot size={24} className="text-[#ff5722]" />
                        Agents
                    </h1>
                    <p className="text-[#555] text-xs mt-1 tracking-wide">public.agents JOIN public.tenants — {agents.length} agents</p>
                </div>
                <button onClick={fetchAgents} className="flex items-center gap-2 px-4 py-2 bg-[#111115] border border-[#1a1a1f] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#333] transition-all"><RefreshCw size={14} /> Refresh</button>
            </div>

            <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..." className="w-full pl-11 pr-4 py-3 bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg text-sm text-white placeholder:text-[#333] outline-none focus:border-[#ff5722]/30 transition-colors" />
            </div>

            <div className="bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="text-[10px] text-[#444] uppercase tracking-widest border-b border-[#1a1a1f]">
                                <th className="p-4">Agent</th>
                                <th className="p-4">Organization</th>
                                <th className="p-4">WebSocket URL</th>
                                <th className="p-4">Lang</th>
                                <th className="p-4">€/min</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-[#111115]">
                            {filtered.map(a => {
                                const isEditing = editingId === a.agent_id;
                                return (
                                    <tr key={a.agent_id} className="hover:bg-[#0d0d11] transition-colors group">
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input value={editForm.agent_name || ""} onChange={e => setEditForm({ ...editForm, agent_name: e.target.value })} className="w-full bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]" />
                                            ) : (
                                                <div>
                                                    <div className="text-white font-medium text-xs">{a.agent_name}</div>
                                                    <div className="text-[10px] text-[#444] font-mono mt-0.5">{a.agent_id.slice(0, 12)}…</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-[#ff5722] text-xs">{a.organization_name}</td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input value={editForm.websocket_url || ""} onChange={e => setEditForm({ ...editForm, websocket_url: e.target.value })} className="w-full bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722] font-mono" placeholder="wss://..." />
                                            ) : (
                                                <span className="text-[11px] text-[#555] font-mono max-w-[250px] block truncate">{a.websocket_url || "—"}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input value={editForm.language_primary || ""} onChange={e => setEditForm({ ...editForm, language_primary: e.target.value })} className="w-16 bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]" />
                                            ) : (
                                                <span className="text-xs text-[#888] uppercase">{a.language_primary}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input type="number" step="0.01" value={editForm.cost_per_minute ?? 0} onChange={e => setEditForm({ ...editForm, cost_per_minute: parseFloat(e.target.value) })} className="w-20 bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]" />
                                            ) : (
                                                <span className="text-xs text-emerald-400">€{a.cost_per_minute?.toFixed(4)}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${editForm.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                    {editForm.is_active ? "Active" : "Inactive"}
                                                </button>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${a.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                    {a.is_active ? "Active" : "Inactive"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={() => saveEdit(a.agent_id)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider hover:bg-emerald-500/20 disabled:opacity-50"><Save size={12} />{saving ? "…" : "Save"}</button>
                                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111115] text-[#666] border border-[#1a1a1f] text-[10px] uppercase tracking-wider hover:text-white"><X size={12} /></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => startEdit(a)} className="p-1.5 rounded-md text-[#444] hover:text-[#ff5722] hover:bg-[#ff5722]/5 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
