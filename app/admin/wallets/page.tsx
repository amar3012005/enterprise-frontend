"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Wallet, RefreshCw, Edit3, Save, X, Search } from "lucide-react";

interface WalletRow {
    wallet_id: string;
    tenant_id: string;
    organization_name: string;
    balance: number;
    currency: string;
    is_auto_recharge_enabled: boolean;
    created_at: string;
}

export default function AdminWalletsPage() {
    const [wallets, setWallets] = useState<WalletRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

    const showToast = (msg: string, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchWallets = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/api/admin/wallets");
        if (res.ok) setWallets(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchWallets(); }, [fetchWallets]);

    const saveEdit = async (id: string) => {
        setSaving(true);
        const res = await apiFetch(`/api/admin/wallets/${id}`, { method: "PUT", body: JSON.stringify(editForm) });
        if (res.ok) { showToast("Wallet updated — Balance overwritten"); setEditingId(null); fetchWallets(); }
        else showToast("Update failed", "error");
        setSaving(false);
    };

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-12 h-12 border-4 border-[#ff5722]/30 border-t-[#ff5722] rounded-full animate-spin" /></div>;

    return (
        <div className="p-8 lg:p-10">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium border ${toast.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{toast.msg}</div>}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                        <Wallet size={24} className="text-[#ff5722]" />
                        Wallets
                    </h1>
                    <p className="text-[#555] text-xs mt-1 tracking-wide">public.wallets — {wallets.length} wallets</p>
                </div>
                <button onClick={fetchWallets} className="flex items-center gap-2 px-4 py-2 bg-[#111115] border border-[#1a1a1f] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#333] transition-all"><RefreshCw size={14} /> Refresh</button>
            </div>

            <div className="bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] text-[#444] uppercase tracking-widest border-b border-[#1a1a1f]">
                                <th className="p-4">ID</th>
                                <th className="p-4">Organization</th>
                                <th className="p-4">Balance</th>
                                <th className="p-4">Currency</th>
                                <th className="p-4">Auto-Recharge</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-[#111115]">
                            {wallets.map(w => {
                                const isEditing = editingId === w.wallet_id;
                                return (
                                    <tr key={w.wallet_id} className="hover:bg-[#0d0d11] transition-colors group">
                                        <td className="p-4 text-[11px] text-[#444] font-mono">{w.wallet_id.slice(0, 8)}…</td>
                                        <td className="p-4 text-xs text-[#ff5722] font-medium">{w.organization_name}</td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input type="number" step="0.01" value={editForm.balance ?? 0} onChange={e => setEditForm({ ...editForm, balance: parseFloat(e.target.value) })} className="w-28 bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]" />
                                            ) : (
                                                <span className={`text-sm font-bold ${w.balance > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    €{w.balance.toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs text-[#888]">{w.currency}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${w.is_auto_recharge_enabled ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-[#111115] text-[#444] border-[#1a1a1f]"}`}>
                                                {w.is_auto_recharge_enabled ? "ON" : "OFF"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[11px] text-[#444]">{w.created_at ? new Date(w.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={() => saveEdit(w.wallet_id)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider hover:bg-emerald-500/20 disabled:opacity-50"><Save size={12} />{saving ? "…" : "Save"}</button>
                                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111115] text-[#666] border border-[#1a1a1f] text-[10px] uppercase tracking-wider hover:text-white"><X size={12} /></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => { setEditingId(w.wallet_id); setEditForm({ balance: w.balance, currency: w.currency }); }} className="p-1.5 rounded-md text-[#444] hover:text-[#ff5722] hover:bg-[#ff5722]/5 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
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
