"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, Box, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface AgentSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDark?: boolean;
}

interface UniversalPayload {
    base: {
        doc_type: "Agent_Skill" | "Agent_Rule" | "Case_Memory" | "General_KB";
        domain: string;
        tenant_id: string;
        created_at: string;
    };
    content: {
        text: string;
        summary?: string;
        metadata?: {
            name?: string;
            [key: string]: any;
        };
    };
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function AgentSkillsModal({ isOpen, onClose, isDark = true }: AgentSkillsModalProps) {
    const [activeTab, setActiveTab] = useState<"manual" | "file">("manual");
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual Entry State
    const [skillName, setSkillName] = useState("");
    const [docType, setDocType] = useState<"Agent_Skill" | "Agent_Rule" | "Case_Memory">("Agent_Skill");
    const [domain, setDomain] = useState("davinciai.eu");
    const [tenantId, setTenantId] = useState("demo");
    const [contentText, setContentText] = useState("");
    const [summary, setSummary] = useState("");

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileDocType, setFileDocType] = useState<"General_KB" | "Website_Map">("General_KB");
    const [fileDomain, setFileDomain] = useState("davinciai.eu");
    const [fileTenantId, setFileTenantId] = useState("demo");
    const [fileTopics, setFileTopics] = useState("");

    const resetForm = useCallback(() => {
        setSkillName("");
        setDocType("Agent_Skill");
        setDomain("davinciai.eu");
        setTenantId("demo");
        setContentText("");
        setSummary("");
        setSelectedFile(null);
        setFileDocType("General_KB");
        setFileDomain("davinciai.eu");
        setFileTenantId("demo");
        setFileTopics("");
        setUploadStatus("idle");
        setStatusMessage("");
    }, []);

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [resetForm, onClose]);

    const getRagBaseUrl = (): string | null => {
        if (typeof window === "undefined") return null;
        try {
            const tenant = localStorage.getItem("tenant");
            if (!tenant) return null;
            const { subdomain } = JSON.parse(tenant);
            if (!subdomain) return null;
            return `https://rag.${subdomain}.davinciai.eu:8444`;
        } catch {
            return null;
        }
    };

    const getAuthToken = (): string | null => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("access_token");
    };

    const handleManualUpload = async () => {
        if (!contentText.trim()) {
            setUploadStatus("error");
            setStatusMessage("Content text is required");
            return;
        }

        setUploadStatus("uploading");
        setStatusMessage("Uploading to HiveMind...");

        const payload: UniversalPayload = {
            base: {
                doc_type: docType,
                domain,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
            },
            content: {
                text: contentText,
                summary: summary || undefined,
                metadata: {
                    name: skillName || undefined,
                },
            },
        };

        try {
            const ragBase = getRagBaseUrl();
            if (!ragBase) throw new Error("RAG endpoint not configured");

            const token = getAuthToken();
            const headers: HeadersInit = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${ragBase}/api/v1/skills`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setUploadStatus("success");
                setStatusMessage("Successfully uploaded to HiveMind!");
                setTimeout(() => {
                    resetForm();
                }, 2000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Upload failed: ${response.status}`);
            }
        } catch (error) {
            setUploadStatus("error");
            setStatusMessage(error instanceof Error ? error.message : "Upload failed");
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            setUploadStatus("error");
            setStatusMessage("Please select a file");
            return;
        }

        setUploadStatus("uploading");
        setStatusMessage("Uploading file to General KB...");

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("doc_type", fileDocType);
        formData.append("domain", fileDomain);
        formData.append("tenant_id", fileTenantId);
        if (fileTopics) {
            formData.append("topics", fileTopics);
        }

        try {
            const ragBase = getRagBaseUrl();
            if (!ragBase) throw new Error("RAG endpoint not configured");

            const token = getAuthToken();
            const headers: HeadersInit = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${ragBase}/api/v1/upload`, {
                method: "POST",
                headers,
                body: formData,
            });

            if (response.ok) {
                setUploadStatus("success");
                setStatusMessage("File successfully uploaded to General KB!");
                setTimeout(() => {
                    resetForm();
                }, 2000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Upload failed: ${response.status}`);
            }
        } catch (error) {
            setUploadStatus("error");
            setStatusMessage(error instanceof Error ? error.message : "Upload failed");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadStatus("idle");
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadStatus("idle");
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark
                            ? "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95"
                            : "bg-white"
                        } backdrop-blur-xl border ${isDark ? "border-cyan-500/20" : "border-slate-200"
                        }`}
                >
                    {/* Header */}
                    <div
                        className={`px-6 py-4 border-b ${isDark ? "border-cyan-500/20 bg-slate-900/50" : "border-slate-200"
                            } flex items-center justify-between`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`p-2 rounded-lg ${isDark ? "bg-cyan-500/10" : "bg-cyan-50"
                                    }`}
                            >
                                <Box className={isDark ? "text-cyan-400" : "text-cyan-600"} size={20} />
                            </div>
                            <div>
                                <h2
                                    className={`text-lg font-bold ${isDark
                                            ? "bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
                                            : "text-slate-900"
                                        }`}
                                >
                                    Agent Skills & Rules
                                </h2>
                                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Inject knowledge into the collective intelligence
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className={`p-2 rounded-lg transition-colors ${isDark
                                    ? "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                                    : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div
                        className={`flex border-b ${isDark ? "border-cyan-500/20 bg-slate-900/30" : "border-slate-200 bg-slate-50"
                            }`}
                    >
                        <button
                            onClick={() => setActiveTab("manual")}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${activeTab === "manual"
                                    ? isDark
                                        ? "border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/50"
                                        : "border-b-2 border-cyan-600 text-cyan-600 bg-white"
                                    : isDark
                                        ? "text-slate-400 hover:text-slate-300"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <FileText className="inline mr-2" size={16} />
                            Manual Entry
                        </button>
                        <button
                            onClick={() => setActiveTab("file")}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${activeTab === "file"
                                    ? isDark
                                        ? "border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/50"
                                        : "border-b-2 border-cyan-600 text-cyan-600 bg-white"
                                    : isDark
                                        ? "text-slate-400 hover:text-slate-300"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <Upload className="inline mr-2" size={16} />
                            File Upload
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {activeTab === "manual" ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Skill Name
                                        </label>
                                        <input
                                            type="text"
                                            value={skillName}
                                            onChange={(e) => setSkillName(e.target.value)}
                                            placeholder="e.g., Customer Support Protocol"
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Document Type
                                        </label>
                                        <select
                                            value={docType}
                                            onChange={(e) =>
                                                setDocType(
                                                    e.target.value as "Agent_Skill" | "Agent_Rule" | "Case_Memory"
                                                )
                                            }
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        >
                                            <option value="Agent_Skill">Agent Skill</option>
                                            <option value="Agent_Rule">Agent Rule</option>
                                            <option value="Case_Memory">Case Memory</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Domain
                                        </label>
                                        <input
                                            type="text"
                                            value={domain}
                                            onChange={(e) => setDomain(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Tenant ID
                                        </label>
                                        <input
                                            type="text"
                                            value={tenantId}
                                            onChange={(e) => setTenantId(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                            }`}
                                    >
                                        Content / Instructions <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        value={contentText}
                                        onChange={(e) => setContentText(e.target.value)}
                                        rows={6}
                                        placeholder="Enter the skill instructions or rule details..."
                                        className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                ? "bg-slate-800/50 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                                                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                                            } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-sm`}
                                    />
                                </div>

                                <div>
                                    <label
                                        className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                            }`}
                                    >
                                        Summary (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                        placeholder="Brief description of this skill/rule"
                                        className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                ? "bg-slate-800/50 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                                                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                                            } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDark
                                            ? "border-slate-700 hover:border-cyan-500 bg-slate-800/30 hover:bg-slate-800/50"
                                            : "border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-slate-100"
                                        }`}
                                >
                                    <Upload
                                        size={48}
                                        className={`mx-auto mb-4 ${isDark ? "text-slate-500" : "text-slate-400"
                                            }`}
                                    />
                                    <p
                                        className={`text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"
                                            }`}
                                    >
                                        {selectedFile ? selectedFile.name : "Drop your file here or click to browse"}
                                    </p>
                                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                                        Supported: PDF, TXT, MD, DOCX
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".pdf,.txt,.md,.docx"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Document Type
                                        </label>
                                        <select
                                            value={fileDocType}
                                            onChange={(e) =>
                                                setFileDocType(e.target.value as "General_KB" | "Website_Map")
                                            }
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        >
                                            <option value="General_KB">General Knowledge Base</option>
                                            <option value="Website_Map">Website Map</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Topics (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={fileTopics}
                                            onChange={(e) => setFileTopics(e.target.value)}
                                            placeholder="e.g., support, sales, technical"
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Domain
                                        </label>
                                        <input
                                            type="text"
                                            value={fileDomain}
                                            onChange={(e) => setFileDomain(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"
                                                }`}
                                        >
                                            Tenant ID
                                        </label>
                                        <input
                                            type="text"
                                            value={fileTenantId}
                                            onChange={(e) => setFileTenantId(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark
                                                    ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-cyan-500"
                                                    : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                                                } focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Message */}
                        {uploadStatus !== "idle" && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${uploadStatus === "success"
                                        ? isDark
                                            ? "bg-green-500/10 border border-green-500/20"
                                            : "bg-green-50 border border-green-200"
                                        : uploadStatus === "error"
                                            ? isDark
                                                ? "bg-red-500/10 border border-red-500/20"
                                                : "bg-red-50 border border-red-200"
                                            : isDark
                                                ? "bg-blue-500/10 border border-blue-500/20"
                                                : "bg-blue-50 border border-blue-200"
                                    }`}
                            >
                                {uploadStatus === "uploading" && (
                                    <Loader2 className="animate-spin text-blue-400" size={20} />
                                )}
                                {uploadStatus === "success" && (
                                    <CheckCircle className="text-green-400" size={20} />
                                )}
                                {uploadStatus === "error" && (
                                    <AlertCircle className="text-red-400" size={20} />
                                )}
                                <p
                                    className={`text-sm font-medium ${uploadStatus === "success"
                                            ? "text-green-400"
                                            : uploadStatus === "error"
                                                ? "text-red-400"
                                                : "text-blue-400"
                                        }`}
                                >
                                    {statusMessage}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        className={`px-6 py-4 border-t ${isDark ? "border-cyan-500/20 bg-slate-900/50" : "border-slate-200 bg-slate-50"
                            } flex justify-end gap-3`}
                    >
                        <button
                            onClick={handleClose}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${isDark
                                    ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={activeTab === "manual" ? handleManualUpload : handleFileUpload}
                            disabled={uploadStatus === "uploading"}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${uploadStatus === "uploading"
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:shadow-lg hover:shadow-cyan-500/20"
                                } ${isDark
                                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                                }`}
                        >
                            {uploadStatus === "uploading" ? (
                                <>
                                    <Loader2 className="inline mr-2 animate-spin" size={16} />
                                    Uploading...
                                </>
                            ) : activeTab === "manual" ? (
                                "Upload to HiveMind"
                            ) : (
                                "Upload to General KB"
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
