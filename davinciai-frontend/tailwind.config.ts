import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Solid Greyscale System
                background: {
                    primary: "#0a0a0a",
                    secondary: "#111111",
                    tertiary: "#1a1a1a",
                    elevated: "#222222",
                    card: "#181818",
                },
                // Text Colors
                foreground: {
                    primary: "#ffffff",
                    secondary: "#a1a1a1",
                    tertiary: "#737373",
                    muted: "#525252",
                },
                // Selective Accents
                accent: {
                    blue: "#3b82f6",
                    orange: "#f97316",
                    green: "#10b981",
                    purple: "#8b5cf6",
                },
                // Border System
                border: {
                    subtle: "#262626",
                    default: "#404040",
                    strong: "#525252",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                display: ["Space Grotesk", "sans-serif"],
                clash: ["Clash Display", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            animation: {
                "shimmer": "shimmer 1.5s infinite",
                "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "slide-up": "slide-up 0.5s ease-out",
                "fade-in": "fade-in 0.3s ease-out",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "pulse-slow": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.5" },
                },
                "slide-up": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
            },
            boxShadow: {
                "glow-blue": "0 0 20px rgba(59, 130, 246, 0.3)",
                "glow-orange": "0 0 20px rgba(249, 115, 22, 0.3)",
                "glow-green": "0 0 20px rgba(16, 185, 129, 0.3)",
            },
        },
    },
    plugins: [],
};
export default config;
