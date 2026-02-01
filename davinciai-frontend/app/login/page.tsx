'use client';

import { useState } from 'react';
import { Eye, EyeOff, Zap, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [enterpriseName, setEnterpriseName] = useState("");
    const [fullName, setFullName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showDemoCreds, setShowDemoCreds] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const response = await fetch("http://127.0.0.1:8000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || "Authentication failed");
                }

                const data = await response.json();
                localStorage.setItem("access_token", data.access_token);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("tenant", JSON.stringify(data.tenant));

                const agentsResponse = await fetch(`http://127.0.0.1:8000/api/tenants/${data.tenant.tenant_id}/agents`);
                if (!agentsResponse.ok) {
                    throw new Error("Failed to fetch agent data");
                }

                const agents = await agentsResponse.json();
                if (agents.length > 0) {
                    const agentId = agents[0].agent_id;
                    window.location.href = `/enterprise/dashboard/${agentId}`;
                } else {
                    throw new Error("No agent found for this enterprise");
                }
            } else {
                const response = await fetch("http://127.0.0.1:8000/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        organization_name: enterpriseName,
                        email,
                        password,
                        full_name: fullName,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || "Registration failed");
                }

                const data = await response.json();
                localStorage.setItem("access_token", data.access_token);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("tenant", JSON.stringify(data.tenant));

                alert("Registration successful! Redirecting to setup...");
                window.location.href = "/";
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Operation failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 md:p-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-5xl bg-[#111111] rounded-2xl overflow-hidden flex shadow-2xl border border-[#262626]"
            >
                {/* Left Side - Brand */}
                <div className="hidden md:flex w-[45%] bg-[#1a1a1a] p-12 flex-col justify-between relative overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="w-full h-full" style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                            backgroundSize: '32px 32px'
                        }} />
                    </div>

                    {/* Decorative gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-blue-500/10 via-orange-500/5 to-transparent" />

                    {/* Header */}
                    <div className="relative z-10">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-orange-500 to-emerald-500 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                DaVinci AI
                            </span>
                        </div>

                        <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {mode === 'login' ? 'Welcome back' : 'Get started'}<br />
                            <span className="text-gradient">to DaVinci AI</span>
                        </h1>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                            {mode === 'login'
                                ? 'Sign in to access your voice agent dashboard and manage your AI conversations.'
                                : 'Complete these easy steps to register your account and start building intelligent voice agents.'}
                        </p>
                    </div>

                    {/* Features */}
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-neutral-300">Enterprise-grade security</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-neutral-300">AI-powered voice agents</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 p-8 md:p-12 bg-[#111111]">
                    {/* Mobile Logo */}
                    <div className="md:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-orange-500 to-emerald-500 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            DaVinci AI
                        </span>
                    </div>

                    <div className="max-w-md mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </h2>
                        <p className="text-sm text-neutral-500 mb-8">
                            {mode === 'login'
                                ? 'Enter your credentials to access your account'
                                : 'Enter your details to create your account'}
                        </p>

                        {/* Demo Credentials */}
                        {mode === 'login' && showDemoCreds && (
                            <div className="mb-8 p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-emerald-500 rounded-l-xl" />
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Developer Access</span>
                                    <button
                                        onClick={() => setShowDemoCreds(false)}
                                        className="text-neutral-500 hover:text-white transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-neutral-400">Email:</span>
                                        <code className="text-emerald-400 font-mono">admin@davinciai.eu</code>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-neutral-400">Password:</span>
                                        <code className="text-emerald-400 font-mono">password123</code>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Register Fields */}
                            {mode === 'register' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                                            Enterprise Name
                                        </label>
                                        <input
                                            type="text"
                                            value={enterpriseName}
                                            onChange={(e) => setEnterpriseName(e.target.value)}
                                            placeholder="Acme Corporation"
                                            className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {mode === 'register' && (
                                    <p className="text-xs text-neutral-500 mt-1.5">Must be at least 8 characters.</p>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                                    </>
                                ) : (
                                    mode === 'login' ? 'Sign In' : 'Create Account'
                                )}
                            </button>
                        </form>

                        {/* Toggle */}
                        <p className="text-center text-sm text-neutral-500 mt-6">
                            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="text-white font-medium hover:text-blue-400 transition-colors"
                            >
                                {mode === 'login' ? 'Sign Up' : 'Log In'}
                            </button>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
