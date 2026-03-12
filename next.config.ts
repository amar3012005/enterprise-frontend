import type { NextConfig } from "next";

// Backend API target.
// For Vercel: set API_URL in the Vercel dashboard environment variables.
// Falls back to the production backend URL.
const API_URL = process.env.API_URL || "https://api.enterprise.davinciai.eu:8450";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // "standalone" is for Docker self-hosting only.
  // Vercel uses its own build pipeline — do NOT set output here.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/rag-api/:path*",
        destination: `https://demo.davinciai.eu:8030/:path*`,
      },
      {
        source: "/webhooks/:path*",
        destination: `${API_URL}/webhooks/:path*`,
      },
      {
        source: "/health",
        destination: `${API_URL}/health`,
      },
    ];
  },
};

export default nextConfig;
