"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Building, Phone, MapPin, Cpu, Sparkles } from "lucide-react";
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
  const [agentWebsocketUrl, setAgentWebsocketUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemoCreds, setShowDemoCreds] = useState(true);
  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [isRightHovered, setIsRightHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const leftPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (leftPanelRef.current) {
      const rect = leftPanelRef.current.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
  };

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
            agent_websocket_url: agentWebsocketUrl || undefined,
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

        window.location.href = "/enterprise/dashboard/agents";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setEmail("b23313@students.iitmandi.ac.in");
    setPassword("528369");
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 lg:p-8 transition-all duration-700 ${isDark ? "bg-[#0a0a0a]" : "bg-[#f0f2f5]"}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[30%] -left-[20%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-10 transition-all duration-1000 ${isDark ? "bg-[#ff5722]" : "bg-[#ff8a65]"}`} style={{ transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)` }} />
        <div className={`absolute top-[30%] -right-[20%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-8 transition-all duration-1000 ${isDark ? "bg-blue-600" : "bg-blue-400"}`} style={{ transform: `translate(${-mousePosition.x * 0.05}px, ${-mousePosition.y * 0.05}px)` }} />
      </div>

      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 z-50 p-3 rounded-full border backdrop-blur-md transition-all duration-500 hover:scale-110 hover:rotate-180 ${isDark
          ? "bg-[#1a1a1a] border-[#333] text-gray-300 hover:text-white hover:border-white/30"
          : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-400"
          }`}
      >
        {isDark ? (
          <svg className="w-5 h-5 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className={`relative z-10 w-full max-w-6xl h-auto min-h-[650px] flex flex-col lg:flex-row overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 ${isDark ? "bg-[#111] border-[#222]" : "bg-white border-gray-200"}`}>
        <div
          ref={leftPanelRef}
          onMouseEnter={() => setIsLeftHovered(true)}
          onMouseLeave={() => setIsLeftHovered(false)}
          onMouseMove={handleMouseMove}
          className={`relative w-full lg:w-5/12 overflow-hidden transition-all duration-700 ease-out ${isDark ? "bg-[#0d0d0d]" : "bg-gradient-to-br from-gray-100 to-gray-200"}`}
        >
          <div className="absolute inset-0">
            <img
              src="/Images/login_page.jpeg"
              alt="DaVinci AI Platform"
              className={`w-full h-full object-cover transition-all duration-1000 ${isLeftHovered ? "scale-110" : "scale-100"}`}
            />
          </div>

          <div className={`absolute inset-0 transition-all duration-700 ${isDark ? "bg-gradient-to-b from-black/60 via-black/40 to-black/70" : "bg-gradient-to-b from-black/40 via-black/20 to-black/60"}`} />

          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
            <div
              className={`mb-8 transition-all duration-700 transform ${isLeftHovered ? "scale-110 translate-y-0" : "scale-100 translate-y-2"}`}
            >
              <img
                src="/Images/davinci-logo.svg"
                alt="DaVinci AI Logo"
                width={120}
                height={120}
                className={`drop-shadow-2xl ${isLeftHovered ? "filter brightness-125" : ""}`}
              />
            </div>

            <h1
              className={`text-5xl lg:text-6xl font-bold tracking-tight transition-all duration-700 transform ${isLeftHovered ? "scale-105 opacity-100" : "scale-100 opacity-90"} ${isDark ? "text-white" : "text-white"}`}
              style={{
                textShadow: "0 4px 30px rgba(0,0,0,0.3)",
              }}
            >
              DaVinci
            </h1>

            <p className={`mt-4 text-lg lg:text-xl tracking-widest uppercase transition-all duration-700 ${isLeftHovered ? "opacity-100" : "opacity-70"} ${isDark ? "text-white/80" : "text-white/90"}`}>
              Enterprise Platform
            </p>

            <div className={`mt-12 flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-sm transition-all duration-500 ${isLeftHovered ? "bg-white/10 scale-100" : "bg-white/5 scale-95 opacity-0"} ${isDark ? "border border-white/10" : "border border-white/20"}`}>
              <Sparkles className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-300"}`} />
              <span className="text-sm font-medium text-white">Next-Gen AI Voice Agents</span>
            </div>
          </div>

          <div className={`absolute bottom-8 left-8 right-8 transition-all duration-500 ${isLeftHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <p className={`text-sm text-center ${isDark ? "text-white/60" : "text-white/70"}`}>
              Trusted by enterprise leaders worldwide
            </p>
          </div>
        </div>

        <div
          className={`relative w-full lg:w-7/12 p-8 lg:p-16 flex flex-col justify-center transition-all duration-700 ease-out ${isDark ? "bg-[#0a0a0a]" : "bg-white"}`}
          onMouseEnter={() => setIsRightHovered(true)}
          onMouseLeave={() => setIsRightHovered(false)}
        >
          <div className={`w-full max-w-md mx-auto transition-all duration-500 ${isRightHovered ? "opacity-100 translate-x-0" : "opacity-90 translate-x-2"}`}>
            <div className="mb-10">
              <h2 className={`text-3xl font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {mode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {mode === "login" ? "Enter your credentials to access your dashboard" : "Start your journey with DaVinci AI"}
              </p>
            </div>

            <div className={`flex p-1 rounded-xl mb-8 w-fit mx-auto lg:mx-0 ${isDark ? "bg-[#151515] border border-[#222]" : "bg-gray-100 border border-gray-200"}`}>
              <button
                onClick={() => setMode("login")}
                className={`px-8 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-300 transform ${mode === "login"
                  ? "bg-[#ff5722] text-white shadow-lg shadow-orange-500/20 scale-105"
                  : `${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"} hover:scale-102`
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`px-8 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-300 transform ${mode === "register"
                  ? "bg-[#ff5722] text-white shadow-lg shadow-orange-500/20 scale-105"
                  : `${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"} hover:scale-102`
                  }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {mode === "login" && showDemoCreds && (
              <div className={`mb-8 p-5 rounded-xl border relative overflow-hidden transition-all duration-300 hover:shadow-lg ${isDark ? "bg-[#151515] border-[#222]" : "bg-gray-50 border-gray-200"}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-[#ff5722]" />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#ff5722] text-white">
                      Demo
                    </span>
                    <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Test Credentials
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDemoCreds(false)}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-gray-500" : "hover:bg-black/5 text-gray-400"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg border ${isDark ? "bg-[#0a0a0a] border-[#333]" : "bg-white border-gray-200"}`}>
                    <div className={`text-[10px] uppercase font-mono mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Email</div>
                    <div className={`text-xs font-mono truncate ${isDark ? "text-orange-400" : "text-orange-600"}`}>b23313@students.iitmandi.ac.in</div>
                  </div>
                  <div className={`p-3 rounded-lg border ${isDark ? "bg-[#0a0a0a] border-[#333]" : "bg-white border-gray-200"}`}>
                    <div className={`text-[10px] uppercase font-mono mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Password</div>
                    <div className={`text-xs font-mono ${isDark ? "text-orange-400" : "text-orange-600"}`}>528369</div>
                  </div>
                </div>

                <button
                  onClick={fillDemoCreds}
                  className="mt-4 w-full py-2.5 text-xs font-semibold uppercase tracking-wide rounded-lg bg-[#ff5722] text-white hover:bg-[#f4511e] transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.98]"
                >
                  Auto-Fill Credentials
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="md:col-span-2">
                    <InputField
                      label="Enterprise Name"
                      value={enterpriseName}
                      onChange={setEnterpriseName}
                      placeholder="Acme Inc."
                      icon={<Building size={16} />}
                      isDark={isDark}
                    />
                  </div>
                  <InputField
                    label="Full Name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="John Doe"
                    icon={<User size={16} />}
                    isDark={isDark}
                  />
                  <InputField
                    label="Phone"
                    value={mobileNumber}
                    onChange={setMobileNumber}
                    placeholder="+1 (555) 000-0000"
                    icon={<Phone size={16} />}
                    isDark={isDark}
                  />
                  <div className="md:col-span-2">
                    <InputField
                      label="Address"
                      value={address}
                      onChange={setAddress}
                      placeholder="123 Innovation Dr, Tech City"
                      icon={<MapPin size={16} />}
                      isDark={isDark}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <InputField
                      label="Agent WebSocket URL (Optional)"
                      value={agentWebsocketUrl}
                      onChange={setAgentWebsocketUrl}
                      placeholder="wss://demo.davinciai.eu:8443"
                      icon={<Cpu size={16} />}
                      isDark={isDark}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <InputField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="name@company.com"
                  icon={<Mail size={16} />}
                  isDark={isDark}
                />

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Password
                  </label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-all duration-300 ${isDark ? "text-gray-500 group-focus-within:text-[#ff5722]" : "text-gray-400 group-focus-within:text-[#ff5722]"}`}>
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-12 py-3.5 rounded-xl border text-sm outline-none transition-all duration-300 ${isDark
                        ? "bg-[#111] border-[#222] text-white placeholder:text-gray-600 focus:border-[#ff5722] focus:bg-[#161616] focus:shadow-lg focus:shadow-orange-500/10"
                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#ff5722] focus:bg-white focus:shadow-lg focus:shadow-orange-500/10"
                        }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-300 ${isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-black/5"}`}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" className={`text-sm transition-colors duration-300 hover:text-[#ff5722] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-[#ff5722] text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:bg-[#ff7043] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="transition-all duration-300 group-hover:translate-x-1">
                      {mode === "login" ? "Sign In" : "Create Account"}
                    </span>
                    <ArrowRight size={18} className="transition-all duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                By continuing, you agree to DaVinci AI&apos;s
                <a href="#" className="hover:text-[#ff5722] transition-colors duration-300 ml-1">Terms of Service</a> and
                <a href="#" className="hover:text-[#ff5722] transition-colors duration-300 ml-1">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, icon, isDark }: any) {
  return (
    <div className="space-y-1.5">
      <label className={`text-xs font-semibold uppercase tracking-wider ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-all duration-300 ${isDark ? "text-gray-500 group-focus-within:text-[#ff5722]" : "text-gray-400 group-focus-within:text-[#ff5722]"}`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? "pl-10" : "pl-4"} pr-4 py-3.5 rounded-xl border text-sm outline-none transition-all duration-300 ${isDark
            ? "bg-[#111] border-[#222] text-white placeholder:text-gray-600 focus:border-[#ff5722] focus:bg-[#161616] focus:shadow-lg focus:shadow-orange-500/10"
            : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#ff5722] focus:bg-white focus:shadow-lg focus:shadow-orange-500/10"
            }`}
        />
      </div>
    </div>
  );
}
