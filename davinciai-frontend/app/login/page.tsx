"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, Cpu, Shield, Zap, Sun, Moon } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enterpriseName, setEnterpriseName] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoCreds, setShowDemoCreds] = useState(true);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        const response = await fetch(apiUrl("/api/auth/login"), {
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

        const agentsResponse = await fetch(
          apiUrl(`/api/tenants/${data.tenant.tenant_id}/agents`),
          { headers: { Authorization: `Bearer ${data.access_token}` } }
        );
        if (!agentsResponse.ok) {
          throw new Error("Failed to fetch agent data");
        }

        const agents = await agentsResponse.json();
        if (agents.length > 0) {
          window.location.href = `/enterprise/dashboard/${agents[0].agent_id}`;
        } else {
          throw new Error("No agent found for this enterprise");
        }
      } else {
        const response = await fetch(apiUrl("/api/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_name: enterpriseName,
            email,
            password,
            full_name: fullName,
            phone_number: mobileNumber,
            address,
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

        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setEmail("admin@davinciai.eu");
    setPassword("password123");
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#0a0a0a]" : "bg-[#f0f0f0]"
      }`}
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Corner brackets decoration */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#ff5722] opacity-60" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#ff5722] opacity-60" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#ff5722] opacity-60" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#ff5722] opacity-60" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-20 z-50 w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          isDark
            ? "bg-[#111] border-[#222] text-white/60 hover:text-[#ff5722] hover:border-[#ff5722]/30"
            : "bg-white border-[#ddd] text-black/60 hover:text-[#ff5722] hover:border-[#ff5722]/30"
        }`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Main container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-[1080px] rounded-2xl overflow-hidden flex flex-col lg:flex-row border-2 transition-colors duration-300 ${
            isDark
              ? "bg-[#0d0d0d] border-[#1a1a1a]"
              : "bg-white border-[#e0e0e0]"
          }`}
          style={{
            boxShadow: isDark
              ? "0 25px 80px rgba(0,0,0,0.6)"
              : "0 25px 80px rgba(0,0,0,0.1)",
          }}
        >
          {/* ═══════════════ LEFT PANEL ═══════════════ */}
          <div className="lg:w-[45%] relative p-10 lg:p-12 flex flex-col justify-between bg-[#0a0a0a] overflow-hidden min-h-[300px] lg:min-h-0">
            {/* Background grid on left panel */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,87,34,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,87,34,0.06) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Accent gradient */}
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,87,34,0.15) 0%, transparent 70%)",
              }}
            />

            {/* Top: Brand + Title */}
            <div className="relative z-10">
              {/* Brand */}
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-lg bg-[#ff5722] flex items-center justify-center">
                  <Cpu size={20} className="text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-lg tracking-tight block leading-none">
                    DaVinci
                  </span>
                  <span className="text-[#ff5722] text-xs font-mono font-semibold tracking-widest uppercase">
                    AI
                  </span>
                </div>
              </div>

              {/* Big headline */}
              <h1 className="text-white text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4">
                {mode === "login" ? (
                  <>
                    SIGN_
                    <br />
                    <span className="text-[#ff5722]">IN</span>
                  </>
                ) : (
                  <>
                    GET_
                    <br />
                    <span className="text-[#ff5722]">STARTED</span>
                  </>
                )}
              </h1>

              <p className="text-white/50 text-sm max-w-[280px] leading-relaxed">
                {mode === "login"
                  ? "Access your enterprise voice agent dashboard and analytics."
                  : "Register your organization and deploy AI voice agents."}
              </p>
            </div>

            {/* Bottom: Feature pills */}
            <div className="relative z-10 flex flex-col gap-3 mt-10">
              {[
                { icon: Shield, label: "Enterprise Security", tag: "SOC2" },
                { icon: Zap, label: "Real-time Analytics", tag: "LIVE" },
                { icon: Cpu, label: "Voice AI Agents", tag: "v2.0" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/5 bg-white/[0.02] backdrop-blur-sm"
                >
                  <item.icon size={16} className="text-[#ff5722]" />
                  <span className="text-white/70 text-sm flex-1">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-[#ff5722] bg-[#ff5722]/10 px-2 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════ RIGHT PANEL (FORM) ═══════════════ */}
          <div
            className={`lg:w-[55%] p-10 lg:p-12 flex flex-col justify-center transition-colors duration-300 ${
              isDark ? "bg-[#0d0d0d]" : "bg-white"
            }`}
          >
            {/* Tab switcher */}
            <div className="flex gap-1 mb-8">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`px-5 py-2 text-sm font-semibold rounded-lg border transition-all duration-200 ${
                  mode === "login"
                    ? "bg-[#ff5722] text-white border-[#ff5722]"
                    : isDark
                      ? "bg-transparent text-white/40 border-white/10 hover:text-white/60 hover:border-white/20"
                      : "bg-transparent text-black/40 border-black/10 hover:text-black/60 hover:border-black/20"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`px-5 py-2 text-sm font-semibold rounded-lg border transition-all duration-200 ${
                  mode === "register"
                    ? "bg-[#ff5722] text-white border-[#ff5722]"
                    : isDark
                      ? "bg-transparent text-white/40 border-white/10 hover:text-white/60 hover:border-white/20"
                      : "bg-transparent text-black/40 border-black/10 hover:text-black/60 hover:border-black/20"
                }`}
              >
                Register
              </button>
            </div>

            {/* Demo Credentials (login only) */}
            {mode === "login" && showDemoCreds && (
              <div
                className={`relative mb-6 rounded-xl overflow-hidden border transition-colors duration-300 ${
                  isDark
                    ? "bg-[#ff5722]/5 border-[#ff5722]/15"
                    : "bg-[#ff5722]/5 border-[#ff5722]/20"
                }`}
              >
                {/* Left accent bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#ff5722] to-[#ff8a65]" />

                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#ff5722] bg-[#ff5722]/10 px-2 py-0.5 rounded uppercase">
                        Demo
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          isDark ? "text-white/60" : "text-black/60"
                        }`}
                      >
                        Test Credentials
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDemoCreds(false)}
                      className={`text-xs w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        isDark
                          ? "text-white/30 hover:text-white/60 hover:bg-white/5"
                          : "text-black/30 hover:text-black/60 hover:bg-black/5"
                      }`}
                    >
                      x
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {[
                      { label: "Email", value: "admin@davinciai.eu" },
                      { label: "Pass", value: "password123" },
                    ].map((cred) => (
                      <div
                        key={cred.label}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                          isDark
                            ? "bg-white/[0.02] border-white/5"
                            : "bg-black/[0.02] border-black/5"
                        }`}
                      >
                        <span
                          className={`text-xs ${
                            isDark ? "text-white/30" : "text-black/30"
                          }`}
                        >
                          {cred.label}
                        </span>
                        <code className="text-xs font-mono text-[#ff5722] font-medium">
                          {cred.value}
                        </code>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={fillDemoCreds}
                    className="mt-3 w-full py-2 text-xs font-semibold font-mono rounded-lg border border-[#ff5722]/20 text-[#ff5722] bg-[#ff5722]/5 hover:bg-[#ff5722]/10 transition-colors"
                  >
                    AUTO-FILL CREDENTIALS
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg border text-sm font-medium ${
                  isDark
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Register-only fields */}
              {mode === "register" && (
                <>
                  <InputField
                    label="Enterprise Name"
                    type="text"
                    value={enterpriseName}
                    onChange={setEnterpriseName}
                    placeholder="Acme Corporation"
                    isDark={isDark}
                    required
                  />
                  <InputField
                    label="Full Name"
                    type="text"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="John Doe"
                    isDark={isDark}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Address"
                      type="text"
                      value={address}
                      onChange={setAddress}
                      placeholder="123 Business St"
                      isDark={isDark}
                      required
                    />
                    <InputField
                      label="Mobile"
                      type="tel"
                      value={mobileNumber}
                      onChange={setMobileNumber}
                      placeholder="+1 234 567 8900"
                      isDark={isDark}
                      required
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <InputField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                isDark={isDark}
                required
              />

              {/* Password */}
              <div>
                <label
                  className={`block text-xs font-medium font-mono uppercase tracking-wider mb-2 ${
                    isDark ? "text-white/40" : "text-black/40"
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm transition-all duration-200 outline-none ${
                      isDark
                        ? "bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#ff5722]/40 focus:bg-white/[0.05]"
                        : "bg-black/[0.02] border-black/10 text-black placeholder:text-black/25 focus:border-[#ff5722]/40 focus:bg-white"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                      isDark
                        ? "text-white/30 hover:text-white/60"
                        : "text-black/30 hover:text-black/60"
                    }`}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full mt-2 py-3.5 rounded-lg bg-[#ff5722] text-white font-bold text-sm tracking-wide transition-all duration-200 hover:bg-[#e64a19] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Toggle mode link */}
            <p
              className={`text-center text-sm mt-6 ${
                isDark ? "text-white/30" : "text-black/30"
              }`}
            >
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-[#ff5722] font-semibold hover:underline underline-offset-2"
              >
                {mode === "login" ? "Register" : "Sign In"}
              </button>
            </p>

            {/* Footer */}
            <div
              className={`mt-8 pt-6 border-t flex items-center justify-between text-[11px] font-mono ${
                isDark
                  ? "border-white/5 text-white/20"
                  : "border-black/5 text-black/20"
              }`}
            >
              <span>DaVinci AI v2.0</span>
              <span>enterprise.davinciai.eu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Reusable Input Field ═══════════════ */
function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  isDark,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  isDark: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className={`block text-xs font-medium font-mono uppercase tracking-wider mb-2 ${
          isDark ? "text-white/40" : "text-black/40"
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg border text-sm transition-all duration-200 outline-none ${
          isDark
            ? "bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#ff5722]/40 focus:bg-white/[0.05]"
            : "bg-black/[0.02] border-black/10 text-black placeholder:text-black/25 focus:border-[#ff5722]/40 focus:bg-white"
        }`}
        required={required}
      />
    </div>
  );
}
