"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
    Users, RefreshCw, Search, Trash2, Save, X, Edit3,
    DollarSign, Activity, Building, Bot, ChevronDown, Zap
} from "lucide-react";

interface GlobalUser {
    user_id: string;
    email: string;
    full_name: string;
    phone_number: string | null;
    role: string;
    login_mode: string;
    tenant_id: string;
    organization_name: string;
    subdomain: string;
    created_at: string;
}

interface GlobalMetrics {
    total_calls: number;
    total_minutes: number;
    total_revenue: number;
    total_tenants: number;
    total_users: number;
    total_agents: number;
}

export default function AdminDatabasePage() {
    const [users, setUsers] = useState<GlobalUser[]>([]);
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<GlobalUser>>({});
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [usersRes, metricsRes] = await Promise.all([
                apiFetch("/api/admin/users"),
                apiFetch("/api/admin/metrics/overview"),
            ]);

            if (!usersRes.ok) throw new Error("Access denied — Master Admin required");

            setUsers(await usersRes.json());
            if (metricsRes.ok) setMetrics(await metricsRes.json());
            setError("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const startEdit = (user: GlobalUser) => {
        setEditingId(user.user_id);
        setEditForm({ full_name: user.full_name, email: user.email, role: user.role, login_mode: user.login_mode });
    };

    const cancelEdit = () => { setEditingId(null); setEditForm({}); };

    const saveEdit = async (userId: string) => {
        setSaving(true);
        try {
            const res = await apiFetch(`/api/admin/users/${userId}`, {
                method: "PUT",
                body: JSON.stringify(editForm),
            });
            if (!res.ok) throw new Error((await res.json()).detail || "Update failed");
            showToast("User updated — DB overwritten", "success");
            cancelEdit();
            fetchData();
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).detail || "Delete failed");
            showToast("User deleted from PostgreSQL", "success");
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleSeedDemo = async () => {
        if (!confirm("This will ensure 'bundb' tenant, wallet and agent exist in production. Proceed?")) return;
        setSeeding(true);
        try {
            const res = await apiFetch("/api/admin/seed-demo", { method: "POST" });
            if (!res.ok) throw new Error("Seeding failed");
            showToast("Demo data synchronized successfully", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setSeeding(false);
        }
    };

    const filteredUsers = users.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
            u.full_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.organization_name.toLowerCase().includes(q) ||
            u.subdomain.toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#ff5722]/30 border-t-[#ff5722] rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <X size={28} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-2">Access Denied</h2>
                    <p className="text-sm text-[#666]">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-10">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium border animate-in slide-in-from-top-2 ${toast.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                        <Users size={24} className="text-[#ff5722]" />
                        Users Database
                    </h1>
                    <p className="text-[#555] text-xs mt-1 tracking-wide">public.users JOIN public.tenants — Live PostgreSQL View</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSeedDemo}
                        disabled={seeding}
                        className="flex items-center gap-2 px-4 py-2 bg-[#ff5722]/10 border border-[#ff5722]/30 rounded-lg text-xs text-[#ff5722] hover:bg-[#ff5722]/20 transition-all disabled:opacity-50"
                    >
                        <Zap size={14} className={seeding ? "animate-pulse" : ""} />
                        {seeding ? "Seeding..." : "Seed Demo"}
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-[#111115] border border-[#1a1a1f] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#333] transition-all"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Metrics Strip */}
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    {[
                        { label: "Revenue", value: `€${metrics.total_revenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
                        { label: "Calls", value: metrics.total_calls.toLocaleString(), icon: Activity, color: "text-blue-400" },
                        { label: "Minutes", value: metrics.total_minutes.toLocaleString(), icon: Activity, color: "text-purple-400" },
                        { label: "Tenants", value: metrics.total_tenants.toLocaleString(), icon: Building, color: "text-[#ff5722]" },
                        { label: "Users", value: metrics.total_users.toLocaleString(), icon: Users, color: "text-cyan-400" },
                        { label: "Agents", value: metrics.total_agents.toLocaleString(), icon: Bot, color: "text-amber-400" },
                    ].map((m) => (
                        <div key={m.label} className="bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-[#555] uppercase tracking-wider">{m.label}</span>
                                <m.icon size={14} className={m.color} />
                            </div>
                            <span className={`text-lg font-bold ${m.color}`}>{m.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users, emails, organizations..."
                    className="w-full pl-11 pr-4 py-3 bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg text-sm text-white placeholder:text-[#333] outline-none focus:border-[#ff5722]/30 transition-colors"
                />
            </div>

            {/* Table */}
            <div className="bg-[#0a0a0e] border border-[#1a1a1f] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#1a1a1f] flex items-center justify-between">
                    <span className="text-xs text-[#555] uppercase tracking-widest">
                        SELECT * FROM users — {filteredUsers.length} rows
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="text-[10px] text-[#444] uppercase tracking-widest border-b border-[#1a1a1f]">
                                <th className="p-4 font-semibold">ID</th>
                                <th className="p-4 font-semibold">Name / Email</th>
                                <th className="p-4 font-semibold">Organization</th>
                                <th className="p-4 font-semibold">Role</th>
                                <th className="p-4 font-semibold">Mode</th>
                                <th className="p-4 font-semibold">Created</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-[#111115]">
                            {filteredUsers.map((user) => {
                                const isEditing = editingId === user.user_id;
                                const isDeleting = deleteConfirm === user.user_id;

                                return (
                                    <tr key={user.user_id} className="hover:bg-[#0d0d11] transition-colors group">
                                        <td className="p-4">
                                            <span className="text-[11px] text-[#444] font-mono">{user.user_id.slice(0, 8)}…</span>
                                        </td>

                                        <td className="p-4">
                                            {isEditing ? (
                                                <div className="space-y-1">
                                                    <input
                                                        value={editForm.full_name || ""}
                                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                        className="w-full bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]"
                                                    />
                                                    <input
                                                        value={editForm.email || ""}
                                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                        className="w-full bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-white font-medium text-xs">{user.full_name}</div>
                                                    <div className="text-[11px] text-[#555]">{user.email}</div>
                                                </>
                                            )}
                                        </td>

                                        <td className="p-4">
                                            <div className="text-[#ff5722] text-xs font-medium">{user.organization_name}</div>
                                            <div className="text-[10px] text-[#333] mt-0.5">{user.subdomain}</div>
                                        </td>

                                        <td className="p-4">
                                            {isEditing ? (
                                                <select
                                                    value={editForm.role || "admin"}
                                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                    className="bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]"
                                                >
                                                    <option value="admin">admin</option>
                                                    <option value="user">user</option>
                                                    <option value="viewer">viewer</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === "admin"
                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                    : "bg-[#111115] text-[#555] border border-[#1a1a1f]"
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-4">
                                            {isEditing ? (
                                                <select
                                                    value={editForm.login_mode || "enterprise"}
                                                    onChange={(e) => setEditForm({ ...editForm, login_mode: e.target.value })}
                                                    className="bg-[#111115] border border-[#333] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ff5722]"
                                                >
                                                    <option value="demo">demo</option>
                                                    <option value="enterprise">enterprise</option>
                                                    <option value="admin">admin</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.login_mode === "admin"
                                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                                    : user.login_mode === "enterprise"
                                                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                        : "bg-[#111115] text-[#555] border border-[#1a1a1f]"
                                                    }`}>
                                                    {user.login_mode}
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-4 text-[11px] text-[#444]">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                        </td>

                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveEdit(user.user_id)}
                                                            disabled={saving}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                                        >
                                                            <Save size={12} />
                                                            {saving ? "Saving..." : "Save"}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111115] text-[#666] border border-[#1a1a1f] text-[10px] uppercase tracking-wider hover:text-white transition-colors"
                                                        >
                                                            <X size={12} />
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : isDeleting ? (
                                                    <>
                                                        <button
                                                            onClick={() => deleteUser(user.user_id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111115] text-[#666] border border-[#1a1a1f] text-[10px] uppercase tracking-wider hover:text-white transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEdit(user)}
                                                            className="p-1.5 rounded-md text-[#444] hover:text-[#ff5722] hover:bg-[#ff5722]/5 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(user.user_id)}
                                                            className="p-1.5 rounded-md text-[#444] hover:text-red-400 hover:bg-red-500/5 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-[#333] text-sm">
                        No users found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                )}
            </div>
        </div>
    );
}
