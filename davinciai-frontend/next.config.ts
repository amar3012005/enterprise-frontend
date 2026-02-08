import type { NextConfig } from "next";

// Server-side only — NOT baked into client bundle.
// Can be changed at runtime without rebuilding the image.
const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
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
