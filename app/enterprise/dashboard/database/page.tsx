"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Database,
    Table2,
    Key,
    Link2,
    FileJson,
    Code,
    Copy,
    Check,
    ChevronRight,
    ChevronDown,
    Layers,
    Hash,
    Type,
    Calendar,
    ToggleLeft,
    DollarSign,
} from "lucide-react";

import { useTheme } from "@/context/ThemeContext";

// ============= DATABASE SCHEMA DEFINITION =============

const DATABASE_SCHEMA = {
    name: "DaVinci AI Enterprise",
    version: "1.0.0",
    description: "PostgreSQL database schema for multi-tenant AI voice agent platform",
    tables: [
        {
            name: "tenants",
            description: "Multi-tenant organizations",
            columns: [
                { name: "tenant_id", type: "UUID", primaryKey: true, nullable: false, default: "gen_random_uuid()" },
                { name: "organization_name", type: "VARCHAR(255)", nullable: false },
                { name: "subdomain", type: "VARCHAR(100)", unique: true, nullable: false, index: true },
                { name: "address", type: "TEXT", nullable: true },
                { name: "plan_tier", type: "VARCHAR(50)", default: "'enterprise'", nullable: false },
                { name: "is_active", type: "BOOLEAN", default: "true", nullable: false },
                { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()", nullable: false },
            ],
            relationships: [
                { type: "one-to-many", table: "users", field: "tenant_id" },
                { type: "one-to-many", table: "wallets", field: "tenant_id" },
                { type: "one-to-many", table: "agents", field: "tenant_id" },
            ],
            indexes: ["subdomain", "is_active"],
            sampleData: {
                tenant_id: "550e8400-e29b-41d4-a716-446655440000",
                organization_name: "Acme Corporation",
                subdomain: "acme",
                plan_tier: "enterprise",
                is_active: true,
                created_at: "2024-01-15T10:30:00Z",
            },
        },
        {
            name: "users",
            description: "Tenant users and administrators",
            columns: [
                { name: "user_id", type: "UUID", primaryKey: true, nullable: false },
                { name: "tenant_id", type: "UUID", foreignKey: "tenants.tenant_id", nullable: false, index: true },
                { name: "email", type: "VARCHAR(255)", unique: true, nullable: false, index: true },
                { name: "full_name", type: "VARCHAR(255)", nullable: false },
                { name: "phone_number", type: "VARCHAR(50)", nullable: true },
                { name: "password_hash", type: "VARCHAR(255)", nullable: false },
                { name: "role", type: "VARCHAR(50)", default: "'admin'", nullable: false },
                { name: "login_mode", type: "ENUM", enum: ["demo", "enterprise", "admin"], default: "'demo'", nullable: false },
                { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()", nullable: false },
            ],
            relationships: [
                { type: "many-to-one", table: "tenants", field: "tenant_id" },
            ],
            indexes: ["tenant_id", "email"],
            sampleData: {
                user_id: "550e8400-e29b-41d4-a716-446655440001",
                tenant_id: "550e8400-e29b-41d4-a716-446655440000",
                email: "admin@acme.com",
                full_name: "John Admin",
                role: "admin",
                login_mode: "enterprise",
                created_at: "2024-01-15T10:35:00Z",
            },
        },
        {
            name: "wallets",
            description: "Tenant billing wallets",
            columns: [
                { name: "wallet_id", type: "UUID", primaryKey: true, nullable: false },
                { name: "tenant_id", type: "UUID", foreignKey: "tenants.tenant_id", nullable: false, index: true },
                { name: "balance", type: "NUMERIC(10,2)", default: "0.00", nullable: false },
                { name: "currency", type: "VARCHAR(3)", default: "'EUR'", nullable: false },
                { name: "is_auto_recharge_enabled", type: "BOOLEAN", default: "false", nullable: false },
                { name: "auto_recharge_amount", type: "NUMERIC(10,2)", default: "0.00", nullable: false },
                { name: "low_balance_threshold", type: "NUMERIC(10,2)", default: "10.00", nullable: false },
                { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()", nullable: false },
            ],
            relationships: [
                { type: "many-to-one", table: "tenants", field: "tenant_id" },
                { type: "one-to-many", table: "agents", field: "wallet_id" },
                { type: "one-to-many", table: "transactions", field: "wallet_id" },
            ],
            indexes: ["tenant_id"],
            sampleData: {
                wallet_id: "550e8400-e29b-41d4-a716-446655440002",
                tenant_id: "550e8400-e29b-41d4-a716-446655440000",
                balance: 1250.50,
                currency: "EUR",
                is_auto_recharge_enabled: true,
                auto_recharge_amount: 500.00,
                low_balance_threshold: 100.00,
                created_at: "2024-01-15T10:40:00Z",
            },
        },
        {
            name: "agents",
            description: "AI voice agents configuration",
            columns: [
                { name: "agent_id", type: "UUID", primaryKey: true, nullable: false },
                { name: "tenant_id", type: "UUID", foreignKey: "tenants.tenant_id", nullable: false, index: true },
                { name: "wallet_id", type: "UUID", foreignKey: "wallets.wallet_id", nullable: true, index: true },
                { name: "agent_name", type: "VARCHAR(255)", nullable: false },
                { name: "agent_description", type: "TEXT", nullable: true },
                { name: "avatar_url", type: "VARCHAR(500)", nullable: true },
                { name: "voice_sample_url", type: "VARCHAR(500)", nullable: true },
                { name: "location", type: "VARCHAR(100)", nullable: true },
                { name: "websocket_url", type: "VARCHAR(500)", nullable: true },
                { name: "phone_number", type: "VARCHAR(50)", nullable: true },
                { name: "sip_uri", type: "VARCHAR(255)", nullable: true },
                { name: "language_primary", type: "VARCHAR(10)", default: "'en'", nullable: false },
                { name: "language_secondary", type: "VARCHAR(10)", nullable: true },
                { name: "llm_config", type: "JSONB", nullable: true },
                { name: "voice_config", type: "JSONB", nullable: true },
                { name: "flow_config", type: "JSONB", nullable: true },
                { name: "cartesia_agent_id", type: "VARCHAR(100)", nullable: true },
                { name: "configuration", type: "TEXT", nullable: true },
                { name: "cost_per_minute", type: "NUMERIC(10,4)", default: "0.1500", nullable: false },
                { name: "routing_tier", type: "VARCHAR(50)", default: "'standard'", nullable: false },
                { name: "is_active", type: "BOOLEAN", default: "true", nullable: false },
                { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()", nullable: false },
            ],
            relationships: [
                { type: "many-to-one", table: "tenants", field: "tenant_id" },
                { type: "many-to-one", table: "wallets", field: "wallet_id" },
                { type: "one-to-many", table: "call_logs", field: "agent_id" },
            ],
            indexes: ["tenant_id", "wallet_id", "is_active"],
            sampleData: {
                agent_id: "550e8400-e29b-41d4-a716-446655440003",
                tenant_id: "550e8400-e29b-41d4-a716-446655440000",
                wallet_id: "550e8400-e29b-41d4-a716-446655440002",
                agent_name: "TARA",
                agent_description: "Task-Aware Responsive Assistant",
                location: "EU-West",
                language_primary: "en",
                cost_per_minute: 0.15,
                routing_tier: "premium",
                is_active: true,
                llm_config: { model: "gpt-4o", temperature: 0.7 },
                voice_config: { provider: "cartesia", voice_id: "abc123" },
                created_at: "2024-01-15T11:00:00Z",
            },
        },
        {
            name: "call_logs",
            description: "Call session records with advanced metrics",
            columns: [
                { name: "id", type: "UUID", primaryKey: true, nullable: false },
                { name: "agent_id", type: "UUID", foreignKey: "agents.agent_id", nullable: false, index: true },
                { name: "start_time", type: "TIMESTAMPTZ", default: "NOW()", nullable: false, index: true },
                { name: "end_time", type: "TIMESTAMPTZ", nullable: true },
                { name: "duration_seconds", type: "INTEGER", default: "0", nullable: false },
                { name: "status", type: "VARCHAR(50)", default: "'completed'", nullable: false, index: true },
                { name: "caller_id", type: "VARCHAR(100)", nullable: true },
                { name: "ttft_ms", type: "INTEGER", nullable: true },
                { name: "ttfc_ms", type: "INTEGER", nullable: true },
                { name: "compression_ratio", type: "FLOAT", nullable: true },
                { name: "sentiment_score", type: "FLOAT", nullable: true },
                { name: "frustration_velocity", type: "VARCHAR(50)", nullable: true },
                { name: "agent_iq", type: "FLOAT", nullable: true },
                { name: "avg_sentiment", type: "FLOAT", nullable: true },
                { name: "correction_count", type: "INTEGER", default: "0", nullable: false },
                { name: "is_churn_risk", type: "BOOLEAN", default: "false", nullable: false, index: true },
                { name: "is_hot_lead", type: "BOOLEAN", default: "false", nullable: false, index: true },
                { name: "priority_level", type: "VARCHAR(20)", default: "'NORMAL'", nullable: false },
                { name: "cost_euros", type: "NUMERIC(10,4)", default: "0.0000", nullable: false },
            ],
            relationships: [
                { type: "many-to-one", table: "agents", field: "agent_id" },
            ],
            indexes: ["agent_id", "start_time", "status", "is_churn_risk", "is_hot_lead"],
            sampleData: {
                id: "550e8400-e29b-41d4-a716-446655440004",
                agent_id: "550e8400-e29b-41d4-a716-446655440003",
                start_time: "2024-01-20T14:30:00Z",
                end_time: "2024-01-20T14:35:30Z",
                duration_seconds: 330,
                status: "completed",
                caller_id: "+1-555-0123",
                ttft_ms: 450,
                sentiment_score: 0.85,
                frustration_velocity: "STABLE",
                agent_iq: 0.92,
                is_churn_risk: false,
                is_hot_lead: true,
                priority_level: "HIGH",
                cost_euros: 0.8250,
            },
        },
        {
            name: "transactions",
            description: "Wallet transaction history",
            columns: [
                { name: "transaction_id", type: "UUID", primaryKey: true, nullable: false },
                { name: "wallet_id", type: "UUID", foreignKey: "wallets.wallet_id", nullable: false, index: true },
                { name: "tenant_id", type: "UUID", foreignKey: "tenants.tenant_id", nullable: false, index: true },
                { name: "type", type: "VARCHAR(50)", nullable: false },
                { name: "amount_euros", type: "NUMERIC(10,4)", nullable: false },
                { name: "description", type: "TEXT", nullable: true },
                { name: "reference_id", type: "VARCHAR(255)", nullable: true },
                { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()", nullable: false },
            ],
            relationships: [
                { type: "many-to-one", table: "wallets", field: "wallet_id" },
                { type: "many-to-one", table: "tenants", field: "tenant_id" },
            ],
            indexes: ["wallet_id", "tenant_id", "created_at"],
            sampleData: {
                transaction_id: "550e8400-e29b-41d4-a716-446655440005",
                wallet_id: "550e8400-e29b-41d4-a716-446655440002",
                tenant_id: "550e8400-e29b-41d4-a716-446655440000",
                type: "topup",
                amount_euros: 500.00,
                description: "Monthly subscription credit",
                reference_id: "pi_3O...",
                created_at: "2024-01-15T10:45:00Z",
            },
        },
    ],
};

// ============= TYPE ICONS =============

const TYPE_ICONS: Record<string, any> = {
    UUID: Hash,
    VARCHAR: Type,
    TEXT: FileJson,
    INTEGER: Hash,
    BIGINT: Hash,
    FLOAT: Hash,
    NUMERIC: DollarSign,
    BOOLEAN: ToggleLeft,
    TIMESTAMPTZ: Calendar,
    TIMESTAMP: Calendar,
    DATE: Calendar,
    JSONB: Code,
    ENUM: Layers,
};

// ============= COMPONENT =============

export default function DatabaseSchemaPage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [selectedTable, setSelectedTable] = useState<string | null>("tenants");
    const [copied, setCopied] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"schema" | "erd" | "sql">("schema");

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const selectedTableData = DATABASE_SCHEMA.tables.find(t => t.name === selectedTable);

    const cardBg = isDark ? "#111111" : "#ffffff";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textPrimary = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
    const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
    const textMuted = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

    return (
        <div style={{
            height: "calc(100vh - 140px)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        backgroundColor: cardBg,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${borderColor}`,
                    }}>
                        <Database size={20} style={{ color: textSecondary }} />
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: 20,
                            fontWeight: 600,
                            margin: 0,
                            color: textPrimary,
                        }}>
                            Database Schema
                        </h1>
                        <p style={{
                            color: textMuted,
                            margin: 0,
                            fontSize: 13,
                            fontFamily: "JetBrains Mono, monospace",
                        }}>
                            PostgreSQL v15 • {DATABASE_SCHEMA.tables.length} Tables
                        </p>
                    </div>
                </div>

                {/* View Toggle */}
                <div style={{
                    display: "flex",
                    gap: 4,
                    padding: 4,
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    borderRadius: 8,
                    border: `1px solid ${borderColor}`,
                }}>
                    {(["schema", "erd", "sql"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 6,
                                border: "none",
                                backgroundColor: viewMode === mode ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") : "transparent",
                                color: viewMode === mode ? textPrimary : textMuted,
                                fontSize: 12,
                                fontWeight: 500,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                cursor: "pointer",
                            }}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                gap: 16,
                flex: 1,
                minHeight: 0,
            }}>
                {/* Sidebar - Table List */}
                <div style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}>
                    <div style={{
                        padding: "16px",
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    }}>
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                        }}>
                            Tables
                        </span>
                    </div>
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: 8,
                    }}>
                        {DATABASE_SCHEMA.tables.map((table) => (
                            <button
                                key={table.name}
                                onClick={() => setSelectedTable(table.name)}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    backgroundColor: selectedTable === table.name ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                                    border: "none",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    textAlign: "left",
                                    marginBottom: 4,
                                }}
                            >
                                <Table2 size={16} style={{ color: textSecondary }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: textPrimary,
                                        textTransform: "lowercase",
                                        fontFamily: "JetBrains Mono, monospace",
                                    }}>
                                        {table.name}
                                    </div>
                                    <div style={{
                                        fontSize: 11,
                                        color: textMuted,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}>
                                        {table.columns.length} columns
                                    </div>
                                </div>
                                <ChevronRight size={14} style={{
                                    color: textMuted,
                                    opacity: selectedTable === table.name ? 1 : 0,
                                }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Panel */}
                <div style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}>
                    {selectedTableData ? (
                        <>
                            {/* Table Header */}
                            <div style={{
                                padding: "20px",
                                borderBottom: `1px solid ${borderColor}`,
                                backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                            }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginBottom: 8,
                                }}>
                                    <Table2 size={20} style={{ color: textSecondary }} />
                                    <h2 style={{
                                        fontSize: 20,
                                        fontWeight: 600,
                                        margin: 0,
                                        color: textPrimary,
                                        fontFamily: "JetBrains Mono, monospace",
                                        textTransform: "lowercase",
                                    }}>
                                        {selectedTableData.name}
                                    </h2>
                                    <button
                                        onClick={() => copyToClipboard(selectedTableData.name, "table-name")}
                                        style={{
                                            padding: 4,
                                            backgroundColor: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: textMuted,
                                        }}
                                    >
                                        {copied === "table-name" ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontSize: 14,
                                    color: textSecondary,
                                }}>
                                    {selectedTableData.description}
                                </p>
                            </div>

                            {/* Tabs */}
                            <div style={{
                                display: "flex",
                                borderBottom: `1px solid ${borderColor}`,
                            }}>
                                {["Columns", "Relationships", "Indexes", "Sample Data"].map((tab, i) => (
                                    <button
                                        key={tab}
                                        style={{
                                            padding: "12px 20px",
                                            backgroundColor: "transparent",
                                            border: "none",
                                            borderBottom: i === 0 ? `2px solid ${textPrimary}` : "none",
                                            color: i === 0 ? textPrimary : textMuted,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Columns Table */}
                            <div style={{
                                flex: 1,
                                overflow: "auto",
                            }}>
                                <table style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                }}>
                                    <thead>
                                        <tr style={{
                                            borderBottom: `1px solid ${borderColor}`,
                                        }}>
                                            <th style={{
                                                padding: "12px 20px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: textMuted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                            }}>
                                                Column
                                            </th>
                                            <th style={{
                                                padding: "12px 20px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: textMuted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                            }}>
                                                Type
                                            </th>
                                            <th style={{
                                                padding: "12px 20px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: textMuted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                            }}>
                                                Constraints
                                            </th>
                                            <th style={{
                                                padding: "12px 20px",
                                                textAlign: "left",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: textMuted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                            }}>
                                                Default
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTableData.columns.map((column, index) => {
                                            const TypeIcon = TYPE_ICONS[column.type.split("(")[0]] || Type;
                                            return (
                                                <tr
                                                    key={column.name}
                                                    style={{
                                                        borderBottom: `1px solid ${borderColor}`,
                                                        backgroundColor: index % 2 === 0 ? (isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)") : "transparent",
                                                    }}
                                                >
                                                    <td style={{ padding: "14px 20px" }}>
                                                        <div style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                        }}>
                                                            {column.primaryKey && (
                                                                <Key size={14} style={{ color: "#f59e0b" }} />
                                                            )}
                                                            {'foreignKey' in column && column.foreignKey && (
                                                                <Link2 size={14} style={{ color: "#3b82f6" }} />
                                                            )}
                                                            <span style={{
                                                                fontSize: 13,
                                                                fontFamily: "JetBrains Mono, monospace",
                                                                color: textPrimary,
                                                                fontWeight: column.primaryKey ? 600 : 400,
                                                            }}>
                                                                {column.name}
                                                            </span>
                                                            {'index' in column && column.index && (
                                                                <span style={{
                                                                    padding: "2px 6px",
                                                                    backgroundColor: isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.1)",
                                                                    borderRadius: 4,
                                                                    fontSize: 9,
                                                                    color: "#3b82f6",
                                                                    textTransform: "uppercase",
                                                                }}>
                                                                    IDX
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "14px 20px" }}>
                                                        <div style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                        }}>
                                                            <TypeIcon size={14} style={{ color: textMuted }} />
                                                            <span style={{
                                                                fontSize: 12,
                                                                fontFamily: "JetBrains Mono, monospace",
                                                                color: textSecondary,
                                                            }}>
                                                                {column.type}
                                                            </span>
                                                            {'enum' in column && column.enum && (
                                                                <span style={{
                                                                    fontSize: 10,
                                                                    color: textMuted,
                                                                }}>
                                                                    ({(column as any).enum.join(", ")})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "14px 20px" }}>
                                                        <div style={{
                                                            display: "flex",
                                                            gap: 6,
                                                        }}>
                                                            {!column.nullable && (
                                                                <span style={{
                                                                    padding: "2px 8px",
                                                                    backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.1)",
                                                                    borderRadius: 4,
                                                                    fontSize: 9,
                                                                    color: "#ef4444",
                                                                    textTransform: "uppercase",
                                                                    fontWeight: 600,
                                                                }}>
                                                                    NOT NULL
                                                                </span>
                                                            )}
                                                            {'unique' in column && column.unique && (
                                                                <span style={{
                                                                    padding: "2px 8px",
                                                                    backgroundColor: isDark ? "rgba(168,85,247,0.1)" : "rgba(168,85,247,0.1)",
                                                                    borderRadius: 4,
                                                                    fontSize: 9,
                                                                    color: "#a855f7",
                                                                    textTransform: "uppercase",
                                                                    fontWeight: 600,
                                                                }}>
                                                                    UNIQUE
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "14px 20px" }}>
                                                        {'default' in column && column.default ? (
                                                            <code style={{
                                                                fontSize: 11,
                                                                fontFamily: "JetBrains Mono, monospace",
                                                                color: textMuted,
                                                                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                                                                padding: "2px 6px",
                                                                borderRadius: 4,
                                                            }}>
                                                                {(column as any).default}
                                                            </code>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: 12,
                                                                color: textMuted,
                                                            }}>
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Sample Data Preview */}
                            {selectedTableData.sampleData && (
                                <div style={{
                                    borderTop: `1px solid ${borderColor}`,
                                    padding: "16px 20px",
                                    backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 12,
                                    }}>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: textMuted,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                        }}>
                                            Sample Record
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(selectedTableData.sampleData, null, 2), "sample")}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                padding: "6px 12px",
                                                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: 6,
                                                fontSize: 11,
                                                color: textSecondary,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {copied === "sample" ? <Check size={14} /> : <Copy size={14} />}
                                            JSON
                                        </button>
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        padding: 16,
                                        backgroundColor: isDark ? "#0a0a0a" : "#f5f5f5",
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontFamily: "JetBrains Mono, monospace",
                                        color: textSecondary,
                                        overflow: "auto",
                                        maxHeight: 200,
                                    }}>
                                        {JSON.stringify(selectedTableData.sampleData, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: textMuted,
                        }}>
                            Select a table to view schema
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
