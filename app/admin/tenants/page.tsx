"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Building, RefreshCw, Edit3, Save, X, Search } from "lucide-react";

interface TenantRow {
    tenant_id: string;
    organization_name: string;
    subdomain: string;
    plan_tier: string;
    is_active: boolean;
    address: string | null;
    created_at: string;
}

export default function AdminTenantsPage() {
    const [tenants, setTenants] = useState<TenantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
    const [search, setSearch] = useState("");

    const showToast = (msg: string, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/api/admin/tenants");
        if (res.ok) setTenants(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchTenants(); }, [fetchTenants]);

    const startEdit = (t: TenantRow) => {
        setEditingId(t.tenant_id);
        setEditForm({ organization_name: t.organization_name, subdomain: t.subdomain, plan_tier: t.plan_tier, is_active: t.is_active });
    };

    const saveEdit = async (id: string) => {
        setSaving(true);
        const res = await apiFetch(`/api/admin/tenants/${id}`, { method: "PUT", body: JSON.stringify(editForm) });
        if (res.ok) { showToast("Tenant updated"); setEditingId(null); fetchTenants(); }
        else showToast("Update failed", "error");
        setSaving(false);
    };

    const filtered = tenants.filter(t => t.organization_name.toLowerCase().includes(search.toLowerCase()) || t.subdomain.toLowerCase().includes(search.toLowerCase()));

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-12 h-12 border-4 border-[#ff5722]/30 border-t-[#ff5722] rounded-full animate-spin" /></div>;

    return (
        <div className="p-8 lg:p-10">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium border ${toast.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{toast.msg}</div>}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                        <Building size={24} className="text-[#ff5722]" />
                        Tenants
                    </h1>
                    <p className="text-[#555] text-xs mt-1 tracking-wide">public.tenants — {tenants.length} organizations</p>
                </div>
                <button onClick={fetchTenants} className="flex items-center gap-2 px-4 py-2 bg-[#111115] border border-[#1a1a1f] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#333] transition-all">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." className="w-full pl-11 pr-4 py-3 bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg text-sm text-white placeholder:text-[#333] outline-none focus:border-[#ff5722]/30 transition-colors" />
            </div>

            <div className="bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] text-[#444] uppercase tracking-widest border-b border-[#1a1a1f]">
                                <th className="p-4">ID</th>
                                <th className="p-4">Organization</th>
                                <th className="p-4">Subdomain</th>
                                <th className="p-4">Plan</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-[#111115]">
                            {filtered.map(t => {
                                const isEditing = editingId === t.tenant_id;
                                return (
                                    <tr key={t.tenant_id} className="hover:bg-[#0d0d11] transition-colors group">
                                        <td className="p-4 text-[11px] text-[#444] font-mono">{t.tenant_id.slice(0, 8)}…</td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input value={editForm.organization_name || ""} onChange={e => setEditForm({ ...editForm, organization_name: e.target.value })} className="w-full bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]" />
                                            ) : (
                                                <span className="text-white font-medium text-xs">{t.organization_name}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input value={editForm.subdomain || ""} onChange={e => setEditForm({ ...editForm, subdomain: e.target.value })} className="bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]" />
                                            ) : (
                                                <span className="text-[#ff5722] text-xs">{t.subdomain}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <select value={editForm.plan_tier || "enterprise"} onChange={e => setEditForm({ ...editForm, plan_tier: e.target.value })} className="bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none">
                                                    <option value="free">free</option>
                                                    <option value="starter">starter</option>
                                                    <option value="enterprise">enterprise</option>
                                                    <option value="custom">custom</option>
                                                </select>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">{t.plan_tier}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${editForm.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                    {editForm.is_active ? "Active" : "Inactive"}
                                                </button>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${t.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                    {t.is_active ? "Active" : "Inactive"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-[11px] text-[#444]">{t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={() => saveEdit(t.tenant_id)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Save size={12} />{saving ? "…" : "Save"}</button>
                                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111115] text-[#666] border border-[#1a1a1f] text-[10px] uppercase tracking-wider hover:text-white transition-colors"><X size={12} /></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => startEdit(t)} className="p-1.5 rounded-md text-[#444] hover:text-[#ff5722] hover:bg-[#ff5722]/5 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
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
