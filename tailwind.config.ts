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
                primary: {
                    50: "#e6f1ff",
                    100: "#cce2ff",
                    200: "#99c5ff",
                    300: "#66a7ff",
                    400: "#338fff",
                    500: "#0066ff",
                    600: "#0052cc",
                    700: "#003d99",
                    800: "#002966",
                    900: "#001433",
                    950: "#000a1a",
                },
                accent: {
                    50: "#e6fdff",
                    100: "#ccf9ff",
                    200: "#99f4ff",
                    300: "#66e7ff",
                    400: "#33e7ff",
                    500: "#00d9ff",
                    600: "#00addb",
                    700: "#0082a3",
                    800: "#00576b",
                    900: "#002c33",
                },
                success: {
                    500: "#00ff88",
                },
                danger: {
                    500: "#ff3366",
                },
                neutral: {
                    950: "#0a0e1a",
                    900: "#111827",
                    800: "#1f2937",
                }
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            backgroundImage: {
                "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
                "mesh-gradient": "radial-gradient(at 40% 20%, rgba(0, 102, 255, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(0, 217, 255, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 102, 255, 0.1) 0px, transparent 50%)",
            },
            boxShadow: {
                "glow-primary": "0 0 20px rgba(0, 102, 255, 0.3)",
                "glow-accent": "0 0 20px rgba(0, 217, 255, 0.3)",
                "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            },
            animation: {
                "shimmer": "shimmer 2s infinite linear",
                "float": "float 6s ease-in-out infinite",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            keyframes: {
                shimmer: {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(100%)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
