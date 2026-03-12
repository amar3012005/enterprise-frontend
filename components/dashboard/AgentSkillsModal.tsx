"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Box, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface AgentSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDark?: boolean;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function AgentSkillsModal({ isOpen, onClose, isDark = true }: AgentSkillsModalProps) {
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileDocType, setFileDocType] = useState<"General_KB" | "Agent_Skill" | "Agent_Rule">("General_KB");
    const [fileTopics, setFileTopics] = useState("");

    const resetForm = useCallback(() => {
        setSelectedFile(null);
        setFileDocType("General_KB");
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
            const parsedTenant = JSON.parse(tenant);
            const tenantId = parsedTenant?.subdomain || parsedTenant?.tenant_id || "davinci";
            return `https://demo.davinciai.eu:8030`;
        } catch {
            return null;
        }
    };

    const getAuthToken = (): string | null => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("access_token");
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            setUploadStatus("error");
            setStatusMessage("Please select a file");
            return;
        }

        setUploadStatus("uploading");
        setStatusMessage("Uploading file to HiveMind...");

        const storedTenant = localStorage.getItem("tenant");
        const tenantInfo = storedTenant ? JSON.parse(storedTenant) : null;
        const tenantId = tenantInfo?.subdomain || tenantInfo?.tenant_id || "davinci";

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("doc_type", fileDocType);
        formData.append("tenant_id", tenantId);
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

            const response = await fetch(`${ragBase}/hivemind/upload?tenant_id=${encodeURIComponent(tenantId)}`, {
                method: "POST",
                headers,
                body: formData,
            });

            if (response.ok) {
                setUploadStatus("success");
                setStatusMessage("File successfully ingested into HiveMind!");
                setTimeout(() => {
                    resetForm();
                    handleClose();
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
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xl bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between bg-[#0a0a0a]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5">
                                <Box className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Upload to HiveMind
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Add knowledge to the collective intelligence
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg transition-colors hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 bg-[#0a0a0a]">
                        {/* File Drop Zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-[#333] rounded-xl p-8 text-center cursor-pointer transition-all hover:border-white/30 hover:bg-white/5 mb-6"
                        >
                            <Upload size={48} className="mx-auto mb-4 text-gray-500" />
                            <p className="text-sm font-medium mb-1 text-gray-300">
                                {selectedFile ? selectedFile.name : "Drop your file here or click to browse"}
                            </p>
                            <p className="text-xs text-gray-500">
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

                        {/* Document Type */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Document Type
                            </label>
                            <select
                                value={fileDocType}
                                onChange={(e) => setFileDocType(e.target.value as "General_KB" | "Agent_Skill" | "Agent_Rule")}
                                className="w-full px-4 py-3 bg-[#111] border border-[#333] text-white text-sm outline-none focus:border-white transition-colors rounded-lg"
                            >
                                <option value="General_KB">General Knowledge Base</option>
                                <option value="Agent_Skill">Agent Skill</option>
                                <option value="Agent_Rule">Agent Rule</option>
                            </select>
                        </div>

                        {/* Topics */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Topics (comma-separated)
                            </label>
                            <input
                                type="text"
                                value={fileTopics}
                                onChange={(e) => setFileTopics(e.target.value)}
                                placeholder="e.g., support, sales, technical"
                                className="w-full px-4 py-3 bg-[#111] border border-[#333] text-white text-sm outline-none focus:border-white transition-colors rounded-lg placeholder:text-gray-600"
                            />
                        </div>

                        {/* Status Message */}
                        {uploadStatus !== "idle" && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-4 p-4 rounded-lg flex items-center gap-3 border ${uploadStatus === "success"
                                    ? "bg-green-500/10 border-green-500/20"
                                    : uploadStatus === "error"
                                        ? "bg-red-500/10 border-red-500/20"
                                        : "bg-blue-500/10 border-blue-500/20"
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
                                <p className={`text-sm font-medium ${uploadStatus === "success"
                                    ? "text-green-400"
                                    : uploadStatus === "error"
                                        ? "text-red-400"
                                        : "text-blue-400"
                                    }`}>
                                    {statusMessage}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-[#222] bg-[#0a0a0a] flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-6 py-2.5 rounded-lg font-medium text-sm transition-colors bg-[#151515] text-gray-300 hover:bg-[#222] border border-[#333]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleFileUpload}
                            disabled={uploadStatus === "uploading" || !selectedFile}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${uploadStatus === "uploading" || !selectedFile
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:shadow-lg"
                                } bg-white text-black hover:bg-gray-200`}
                        >
                            {uploadStatus === "uploading" ? (
                                <>
                                    <Loader2 className="inline mr-2 animate-spin" size={16} />
                                    Uploading...
                                </>
                            ) : (
                                "Upload to HiveMind"
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
