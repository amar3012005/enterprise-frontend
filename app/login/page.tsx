"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Building, Phone, MapPin, Cpu } from "lucide-react";
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
  const [showAccessKeyModal, setShowAccessKeyModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [accessKeyError, setAccessKeyError] = useState("");
  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
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

    // --- ACCESS KEY CHECK FOR DEMO ---
    if (mode === "login" && email === "b23313@students.iitmandi.ac.in" && password === "528369") {
      setShowAccessKeyModal(true);
      return;
    }

    performLogin();
  };

  const performLogin = async () => {
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

  const handleAccessKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAccessKeyError("");

    if (accessKey === "528369") {
      setShowAccessKeyModal(false);
      performLogin();
    } else {
      setAccessKeyError("Invalid access key. Please try again.");
    }
  };

  return (
    <div className={`w-full h-screen flex overflow-hidden ${isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-[40%] -left-[30%] w-[100%] h-[100%] rounded-full blur-[180px] opacity-12 transition-all duration-1000 ease-out ${isDark ? "bg-[#ff5722]" : "bg-[#ff8a65]"}`}
          style={{
            transform: `translate(${(mousePosition.x - 50) * 0.15}px, ${(mousePosition.y - 50) * 0.15}px)`,
          }}
        />
        <div
          className={`absolute top-[20%] -right-[30%] w-[90%] h-[90%] rounded-full blur-[180px] opacity-10 transition-all duration-1000 ease-out ${isDark ? "bg-blue-600" : "bg-blue-400"}`}
          style={{
            transform: `translate(${(50 - mousePosition.x) * 0.1}px, ${(50 - mousePosition.y) * 0.1}px)`,
          }}
        />
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

      <div className={`relative z-10 w-full h-full flex flex-col lg:flex-row overflow-hidden ${isDark ? "bg-[#111]" : "bg-white"}`}>
        <div
          ref={leftPanelRef}
          onMouseEnter={() => setIsLeftHovered(true)}
          onMouseLeave={() => setIsLeftHovered(false)}
          onMouseMove={handleMouseMove}
          className={`relative w-full lg:w-1/2 overflow-hidden transition-all duration-1000 ease-out ${isDark ? "bg-[#0d0d0d]" : "bg-gradient-to-br from-gray-900 to-gray-800"}`}
        >
          <div className="absolute inset-0">
            <img
              src="/Images/login_page.jpeg"
              alt="DaVinci AI Platform"
              className={`w-full h-full object-cover transition-all duration-1000 ${isLeftHovered ? "scale-110" : "scale-105"}`}
            />
          </div>

          <div className={`absolute inset-0 transition-all duration-700 ${isDark ? "bg-gradient-to-b from-black/70 via-black/50 to-black/80" : "bg-gradient-to-b from-black/60 via-black/40 to-black/70"}`} />

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div
              className={`transition-all duration-700 ${isLeftHovered ? "scale-110 opacity-100" : "scale-100 opacity-90"}`}
            >
              <img
                src="/Images/davinci-logo.svg"
                alt="DaVinci AI Logo"
                width={180}
                height={180}
                className={`transition-all duration-700 ${isLeftHovered
                  ? "filter brightness-125 drop-shadow-[0_0_40px_rgba(255,87,34,0.6)]"
                  : "filter brightness-110 drop-shadow-[0_0_30px_rgba(255,87,34,0.4)]"
                  }`}
              />
            </div>
          </div>
        </div>

        <div className={`relative w-full lg:w-1/2 p-8 lg:p-16 xl:p-20 flex flex-col justify-center ${isDark ? "bg-[#0a0a0a]" : "bg-white"}`}>
          <div className={`w-full max-w-md mx-auto ${isDark ? "text-white" : "text-black"}`}>
            <div className="mb-10">
              <h2 className={`text-3xl font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {mode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {mode === "login" ? "Enter your credentials to access your dashboard" : "Start your journey with DaVinci AI"}
              </p>
            </div>

            <div className={`flex mb-8 w-fit ${isDark ? "bg-[#151515] border border-[#222]" : "bg-gray-100 border border-gray-200"}`}>
              <button
                onClick={() => setMode("login")}
                className={`px-8 py-2.5 text-sm font-semibold transition-all duration-200 ${mode === "login"
                  ? "bg-black text-white"
                  : `${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`px-8 py-2.5 text-sm font-semibold transition-all duration-200 ${mode === "register"
                  ? "bg-black text-white"
                  : `${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`
                  }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {mode === "login" && showDemoCreds && (
              <div className={`mb-8 p-4 border ${isDark ? "bg-[#151515] border-[#222]" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white">
                      Demo
                    </span>
                    <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Test Credentials
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDemoCreds(false)}
                    className={`text-lg leading-none transition-colors ${isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-2 border ${isDark ? "bg-black/50 border-[#333]" : "bg-white border-gray-200"}`}>
                    <div className={`text-[10px] uppercase font-mono mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Email</div>
                    <div className={`text-xs font-mono truncate ${isDark ? "text-orange-400" : "text-orange-600"}`}>b23313@students.iitmandi.ac.in</div>
                  </div>
                  <div className={`p-2 border ${isDark ? "bg-black/50 border-[#333]" : "bg-white border-gray-200"}`}>
                    <div className={`text-[10px] uppercase font-mono mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Password</div>
                    <div className={`text-xs font-mono ${isDark ? "text-orange-400" : "text-orange-600"}`}>528369</div>
                  </div>
                </div>

                <button
                  onClick={fillDemoCreds}
                  className="mt-3 w-full py-2.5 text-xs font-semibold uppercase tracking-wide bg-black text-white hover:bg-gray-900 transition-colors"
                >
                  Auto-Fill Credentials
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  <label className={`text-xs font-semibold uppercase tracking-wider ml-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Password
                  </label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isDark ? "text-gray-500 group-focus-within:text-black" : "text-gray-400 group-focus-within:text-black"}`}>
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-12 py-3 border text-sm outline-none transition-colors ${isDark
                        ? "bg-[#151515] border-[#333] text-white placeholder:text-gray-600 focus:bg-black focus:border-black"
                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black"
                        }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors ${isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" className={`text-sm transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <p className={`text-sm text-center ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                By continuing, you agree to DaVinci AI&apos;s{" "}
                <a href="#" className="hover:text-black transition-colors underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="hover:text-black transition-colors underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Access Key Modal */}
      {showAccessKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAccessKeyModal(false)}
          />
          <div className={`relative w-full max-w-sm p-8 border shadow-2xl transition-all duration-300 transform scale-100 ${isDark ? "bg-[#111] border-[#333] text-white" : "bg-white border-gray-200 text-black"
            }`}>
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">Access Key Required</h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Please enter the security access key to proceed with the demo account.
              </p>
            </div>

            <form onSubmit={handleAccessKeySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Security Code
                </label>
                <input
                  type="password"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="••••••"
                  autoFocus
                  className={`w-full px-4 py-3 border text-center text-xl font-mono tracking-[0.5em] outline-none transition-colors ${isDark
                    ? "bg-black border-[#333] text-orange-500 focus:border-orange-500 placeholder:text-gray-800"
                    : "bg-gray-50 border-gray-300 text-orange-600 focus:border-black placeholder:text-gray-300"
                    }`}
                />
              </div>

              {accessKeyError && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] text-center font-bold uppercase tracking-tight animate-pulse">
                  {accessKeyError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccessKeyModal(false)}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border transition-colors ${isDark ? "border-[#333] text-gray-500 hover:text-white hover:bg-[#1a1a1a]" : "border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50"
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-wider hover:bg-gray-900 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                >
                  Verify Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, icon, isDark }: any) {
  return (
    <div className="space-y-1.5">
      <label className={`text-xs font-semibold uppercase tracking-wider ml-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isDark ? "text-gray-500 group-focus-within:text-black" : "text-gray-400 group-focus-within:text-black"}`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? "pl-10" : "pl-4"} pr-4 py-3 border text-sm outline-none transition-colors ${isDark
            ? "bg-[#151515] border-[#333] text-white placeholder:text-gray-600 focus:bg-black focus:border-black"
            : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black"
            }`}
        />
      </div>
    </div>
  );
}
