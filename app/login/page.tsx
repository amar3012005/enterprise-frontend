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

  // Apply theme class to html element
  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
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

        // Fetch the enterprise's agent
        const agentsResponse = await fetch(
          apiUrl(`/api/tenants/${data.tenant.tenant_id}/agents`),
          { headers: { Authorization: `Bearer ${data.access_token}` } }
        );

        if (agentsResponse.ok) {
          const agents = await agentsResponse.json();
          if (agents.length > 0) {
            // Use agent_id (underscore) — matches [agent_id] route folder
            window.location.href = `/enterprise/dashboard/${agents[0].agent_id}`;
            return;
          }
        }

        // Fallback: go to agents list
        window.location.href = "/enterprise/dashboard/agents";
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

        // Backend auto-creates a default agent on registration — fetch and redirect
        const agentsRes = await fetch(
          apiUrl(`/api/tenants/${data.tenant.tenant_id}/agents`),
          { headers: { Authorization: `Bearer ${data.access_token}` } }
        );
        if (agentsRes.ok) {
          const agents = await agentsRes.json();
          if (agents.length > 0) {
            window.location.href = `/enterprise/dashboard/${agents[0].agent_id}`;
            return;
          }
        }
        window.location.href = "/enterprise/dashboard/agents";
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

  // ─── Shared style tokens ───
  const bg = isDark ? "bg-[#0a0a0a]" : "bg-[#f0f0f0]";
  const cardBg = isDark ? "bg-[#0d0d0d]" : "bg-white";
  const cardBorder = isDark ? "border-[#1a1a1a]" : "border-[#d0d0d0]";
  const textPrimary = isDark ? "text-white" : "text-[#1a1a1a]";
  const textMuted = isDark ? "text-white/40" : "text-black/40";
  const textSoft = isDark ? "text-white/60" : "text-black/50";
  const inputBg = isDark
    ? "bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#ff5722]/50 focus:bg-white/[0.05]"
    : "bg-black/[0.02] border-black/10 text-[#1a1a1a] placeholder:text-black/25 focus:border-[#ff5722]/50 focus:bg-white";

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${bg}`}>
      {/* ═══ GRID PATTERN ═══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ═══ CORNER BRACKETS ═══ */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#ff5722]" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#ff5722]" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#ff5722]" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#ff5722]" />

      {/* ═══ THEME TOGGLE ═══ */}
      <button
        onClick={toggleTheme}
        className={`absolute top-5 right-16 z-50 w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          isDark
            ? "bg-[#111] border-[#222] text-white/50 hover:text-[#ff5722] hover:border-[#ff5722]/40"
            : "bg-white border-[#ccc] text-black/50 hover:text-[#ff5722] hover:border-[#ff5722]/40"
        }`}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* ═══ MAIN ═══ */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div
          className={`w-full max-w-[1060px] rounded-2xl overflow-hidden flex flex-col lg:flex-row border-2 transition-colors duration-300 ${cardBg} ${cardBorder}`}
          style={{
            boxShadow: isDark
              ? "0 24px 80px rgba(0,0,0,0.6)"
              : "0 24px 80px rgba(0,0,0,0.08)",
          }}
        >
          {/* ════════════════ LEFT PANEL ════════════════ */}
          <div className="lg:w-[44%] relative p-10 lg:p-12 flex flex-col justify-between bg-[#0a0a0a] overflow-hidden">
            {/* Orange grid on dark panel */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,87,34,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,87,34,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Glow */}
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(255,87,34,0.12) 0%, transparent 70%)",
              }}
            />

            {/* ── Brand + headline ── */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-lg bg-[#ff5722] flex items-center justify-center">
                  <Cpu size={20} className="text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-lg tracking-tight block leading-none">
                    DaVinci
                  </span>
                  <span className="text-[#ff5722] text-[10px] font-mono font-bold tracking-[0.25em] uppercase">
                    AI ENTERPRISE
                  </span>
                </div>
              </div>

              <h1 className="text-white font-extrabold tracking-tight leading-[1.05] mb-4"
                style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)" }}>
                {mode === "login" ? (
                  <>SIGN_<br /><span className="text-[#ff5722]">IN</span></>
                ) : (
                  <>GET_<br /><span className="text-[#ff5722]">STARTED</span></>
                )}
              </h1>

              <p className="text-white/45 text-sm leading-relaxed max-w-[280px]">
                {mode === "login"
                  ? "Access your enterprise voice agent dashboard and real-time analytics."
                  : "Register your organization and deploy AI-powered voice agents."}
              </p>
            </div>

            {/* ── Feature pills ── */}
            <div className="relative z-10 flex flex-col gap-2.5 mt-10">
              {[
                { icon: Shield, label: "Enterprise Security", tag: "SOC2" },
                { icon: Zap, label: "Real-time Analytics", tag: "LIVE" },
                { icon: Cpu, label: "Voice AI Agents", tag: "v2.0" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                >
                  <item.icon size={15} className="text-[#ff5722] shrink-0" />
                  <span className="text-white/60 text-[13px] flex-1">{item.label}</span>
                  <span className="text-[9px] font-mono font-bold text-[#ff5722] bg-[#ff5722]/10 px-2 py-0.5 rounded tracking-wide">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════ RIGHT PANEL ════════════════ */}
          <div className={`lg:w-[56%] p-10 lg:p-12 flex flex-col justify-center transition-colors duration-300 ${cardBg}`}>
            {/* ── Tab switcher ── */}
            <div className="flex gap-1 mb-7">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg border transition-all duration-200 ${
                    mode === tab
                      ? "bg-[#ff5722] text-white border-[#ff5722]"
                      : isDark
                        ? "bg-transparent text-white/35 border-white/10 hover:text-white/55 hover:border-white/20"
                        : "bg-transparent text-black/35 border-black/10 hover:text-black/55 hover:border-black/20"
                  }`}
                >
                  {tab === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* ── Demo credentials ── */}
            {mode === "login" && showDemoCreds && (
              <div
                className={`relative mb-6 rounded-xl overflow-hidden border ${
                  isDark ? "bg-[#ff5722]/[0.04] border-[#ff5722]/15" : "bg-[#ff5722]/[0.04] border-[#ff5722]/20"
                }`}
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#ff5722] to-[#ff8a65]" />
                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-[#ff5722] bg-[#ff5722]/10 px-2 py-0.5 rounded uppercase tracking-wide">
                        Demo
                      </span>
                      <span className={`text-xs font-medium ${textSoft}`}>Test Credentials</span>
                    </div>
                    <button
                      onClick={() => setShowDemoCreds(false)}
                      className={`text-xs w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        isDark ? "text-white/25 hover:text-white/50 hover:bg-white/5" : "text-black/25 hover:text-black/50 hover:bg-black/5"
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
                          isDark ? "bg-white/[0.02] border-white/[0.04]" : "bg-black/[0.02] border-black/[0.04]"
                        }`}
                      >
                        <span className={`text-[11px] ${textMuted}`}>{cred.label}</span>
                        <code className="text-[11px] font-mono text-[#ff5722] font-semibold">{cred.value}</code>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoCreds}
                    className="mt-3 w-full py-2 text-[11px] font-bold font-mono rounded-lg border border-[#ff5722]/20 text-[#ff5722] bg-[#ff5722]/[0.04] hover:bg-[#ff5722]/10 transition-colors tracking-wide"
                  >
                    AUTO-FILL CREDENTIALS
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg border text-sm font-medium ${
                  isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
                }`}
              >
                {error}
              </div>
            )}

            {/* ══ FORM ══ */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "register" && (
                <>
                  <Field label="Enterprise Name" type="text" value={enterpriseName} onChange={setEnterpriseName}
                    placeholder="Acme Corporation" isDark={isDark} inputBg={inputBg} textMuted={textMuted} required />
                  <Field label="Full Name" type="text" value={fullName} onChange={setFullName}
                    placeholder="John Doe" isDark={isDark} inputBg={inputBg} textMuted={textMuted} required />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Address" type="text" value={address} onChange={setAddress}
                      placeholder="123 Business St" isDark={isDark} inputBg={inputBg} textMuted={textMuted} required />
                    <Field label="Mobile" type="tel" value={mobileNumber} onChange={setMobileNumber}
                      placeholder="+1 234 567 8900" isDark={isDark} inputBg={inputBg} textMuted={textMuted} required />
                  </div>
                </>
              )}

              <Field label="Email" type="email" value={email} onChange={setEmail}
                placeholder="you@company.com" isDark={isDark} inputBg={inputBg} textMuted={textMuted} required />

              {/* Password (with toggle) */}
              <div>
                <label className={`block text-[11px] font-medium font-mono uppercase tracking-wider mb-2 ${textMuted}`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm transition-all duration-200 outline-none ${inputBg}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                      isDark ? "text-white/25 hover:text-white/50" : "text-black/25 hover:text-black/50"
                    }`}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full mt-1 py-3.5 rounded-lg bg-[#ff5722] text-white font-bold text-sm tracking-wide transition-all duration-200 hover:bg-[#e64a19] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle mode */}
            <p className={`text-center text-sm mt-5 ${textMuted}`}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-[#ff5722] font-semibold hover:underline underline-offset-2"
              >
                {mode === "login" ? "Register" : "Sign In"}
              </button>
            </p>

            {/* Footer */}
            <div className={`mt-7 pt-5 border-t flex items-center justify-between text-[10px] font-mono ${
              isDark ? "border-white/[0.04] text-white/20" : "border-black/[0.06] text-black/20"
            }`}>
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
function Field({
  label, type, value, onChange, placeholder, isDark, inputBg, textMuted, required,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; isDark: boolean; inputBg: string; textMuted: string; required?: boolean;
}) {
  return (
    <div>
      <label className={`block text-[11px] font-medium font-mono uppercase tracking-wider mb-2 ${textMuted}`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg border text-sm transition-all duration-200 outline-none ${inputBg}`}
        required={required}
      />
    </div>
  );
}
