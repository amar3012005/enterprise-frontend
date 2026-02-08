"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (mode === 'login') {
                // Login logic
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
                // Register logic
                const response = await fetch("http://127.0.0.1:8000/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        organization_name: enterpriseName,
                        email,
                        password,
                        full_name: fullName,
                        phone_number: mobileNumber,
                        address: address
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
                window.location.href = "/"; // For now redirect to root or a setup page
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Operation failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Main Container */}
            <div style={{
                width: '100%',
                maxWidth: '1000px',
                backgroundColor: '#000000',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                border: '3px solid #1a1a1a'
            }}>
                {/* Left Side - Teal Gradient */}
                <div style={{
                    width: '45%',
                    background: 'linear-gradient(135deg, #2d5f5d 0%, #1a3a38 100%)',
                    padding: '60px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                }}>
                    {/* Radial gradient overlay */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, rgba(45,95,93,0.8) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    {/* Header */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h1 style={{
                            fontSize: '36px',
                            fontWeight: 700,
                            color: '#ffffff',
                            marginBottom: '12px',
                            lineHeight: 1.2
                        }}>
                            {mode === 'login' ? 'Welcome Back' : 'Get Started'}<br />{mode === 'login' ? 'to DaVinci AI' : 'with Us'}
                        </h1>
                        <p style={{
                            fontSize: '14px',
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1.5
                        }}>
                            {mode === 'login'
                                ? 'Sign in to access your voice agent dashboard'
                                : 'Complete these easy steps to register your account'}
                        </p>
                    </div>

                    {/* Step Cards - Only show for register */}
                    {mode === 'register' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            {/* Step 1 */}
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '12px',
                                padding: '24px 16px',
                                cursor: 'pointer'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#000000',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    marginBottom: '16px'
                                }}>
                                    1
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#000000',
                                    fontWeight: 500,
                                    lineHeight: 1.4
                                }}>
                                    Sign up your<br />account
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderRadius: '12px',
                                padding: '24px 16px',
                                cursor: 'pointer'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    marginBottom: '16px'
                                }}>
                                    2
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.9)',
                                    fontWeight: 500,
                                    lineHeight: 1.4
                                }}>
                                    Set up your<br />workspace
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderRadius: '12px',
                                padding: '24px 16px',
                                cursor: 'pointer'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    marginBottom: '16px'
                                }}>
                                    3
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.9)',
                                    fontWeight: 500,
                                    lineHeight: 1.4
                                }}>
                                    Set up your<br />profile
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side - Form */}
                <div style={{
                    width: '55%',
                    backgroundColor: '#000000',
                    padding: '60px 50px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '8px'
                    }}>
                        {mode === 'login' ? 'Sign In' : 'Sign Up Account'}
                    </h2>
                    <p style={{
                        fontSize: '13px',
                        color: '#888888',
                        marginBottom: '28px'
                    }}>
                        {mode === 'login'
                            ? 'Enter your credentials to access your account'
                            : 'Enter your personal data to create your account'}
                    </p>

                    {/* Demo Credentials */}
                    {mode === 'login' && showDemoCreds && (
                        <div style={{
                            backgroundColor: 'rgba(45, 95, 93, 0.05)',
                            border: '1px solid rgba(45, 95, 93, 0.2)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '32px',
                            position: 'relative',
                            overflow: 'hidden',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: '4px',
                                background: 'linear-gradient(to bottom, #2d5f5d, #4ade80)'
                            }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: '#2d5f5d',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px'
                                        }}>★</div>
                                        <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                            Developer Test Access
                                        </h4>
                                    </div>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#888888' }}>Email:</span>
                                            <code style={{ fontSize: '12px', color: '#4ade80', fontWeight: 500 }}>admin@davinciai.eu</code>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#888888' }}>Pass:</span>
                                            <code style={{ fontSize: '12px', color: '#4ade80', fontWeight: 500 }}>password123</code>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDemoCreds(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: 'none',
                                        color: '#666666',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        marginLeft: '12px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Social Buttons - Only for register */}
                    {mode === 'register' && (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                marginBottom: '24px'
                            }}>
                                <button style={{
                                    backgroundColor: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#000000',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Google
                                </button>
                                <button style={{
                                    backgroundColor: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#000000',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    Github
                                </button>
                            </div>

                            {/* Or Divider */}
                            <div style={{
                                position: 'relative',
                                textAlign: 'center',
                                marginBottom: '24px'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: 0,
                                    right: 0,
                                    height: '1px',
                                    backgroundColor: '#333333'
                                }} />
                                <span style={{
                                    position: 'relative',
                                    backgroundColor: '#000000',
                                    padding: '0 12px',
                                    fontSize: '13px',
                                    color: '#666666'
                                }}>
                                    Or
                                </span>
                            </div>
                        </>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {/* Register Fields */}
                        {mode === 'register' && (
                            <>
                                {/* Enterprise Name */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#aaaaaa',
                                        marginBottom: '6px',
                                        fontWeight: 500
                                    }}>
                                        Enterprise Name
                                    </label>
                                    <input
                                        type="text"
                                        value={enterpriseName}
                                        onChange={(e) => setEnterpriseName(e.target.value)}
                                        placeholder="eg. Acme Corporation"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid #333333',
                                            borderRadius: '8px',
                                            padding: '12px 14px',
                                            fontSize: '14px',
                                            color: '#ffffff',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>

                                {/* Full Name */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#aaaaaa',
                                        marginBottom: '6px',
                                        fontWeight: 500
                                    }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="eg. John Doe"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid #333333',
                                            borderRadius: '8px',
                                            padding: '12px 14px',
                                            fontSize: '14px',
                                            color: '#ffffff',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>

                                {/* Address */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#aaaaaa',
                                        marginBottom: '6px',
                                        fontWeight: 500
                                    }}>
                                        Address
                                    </label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="eg. 123 Business Way, City"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid #333333',
                                            borderRadius: '8px',
                                            padding: '12px 14px',
                                            fontSize: '14px',
                                            color: '#ffffff',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>

                                {/* Mobile Number */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#aaaaaa',
                                        marginBottom: '6px',
                                        fontWeight: 500
                                    }}>
                                        Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={mobileNumber}
                                        onChange={(e) => setMobileNumber(e.target.value)}
                                        placeholder="eg. +1 234 567 8900"
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid #333333',
                                            borderRadius: '8px',
                                            padding: '12px 14px',
                                            fontSize: '14px',
                                            color: '#ffffff',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                color: '#aaaaaa',
                                marginBottom: '6px',
                                fontWeight: 500
                            }}>
                                Email
                            </label>
                            <input
                                suppressHydrationWarning={true}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={mode === 'login' ? "you@company.com" : "eg. john@acme.com"}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#1a1a1a',
                                    border: '1px solid #333333',
                                    borderRadius: '8px',
                                    padding: '12px 14px',
                                    fontSize: '14px',
                                    color: '#ffffff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                color: '#aaaaaa',
                                marginBottom: '6px',
                                fontWeight: 500
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333333',
                                        borderRadius: '8px',
                                        padding: '12px 40px 12px 14px',
                                        fontSize: '14px',
                                        color: '#ffffff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#666666',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {mode === 'register' && (
                                <p style={{
                                    fontSize: '11px',
                                    color: '#666666',
                                    marginTop: '6px'
                                }}>
                                    Must be at least 8 characters.
                                </p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '13px',
                                color: '#ef4444',
                                marginBottom: '16px'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                backgroundColor: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '14px',
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#000000',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                marginTop: '8px',
                                marginBottom: '16px',
                                opacity: isLoading ? 0.6 : 1
                            }}
                        >
                            {isLoading ? (mode === 'login' ? 'Signing in...' : 'Signing up...') : (mode === 'login' ? 'Sign In' : 'Sign Up')}
                        </button>

                        {/* Toggle Link */}
                        <p style={{
                            textAlign: 'center',
                            fontSize: '13px',
                            color: '#888888'
                        }}>
                            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline'
                                }}
                            >
                                {mode === 'login' ? 'Sign Up' : 'Log in'}
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
