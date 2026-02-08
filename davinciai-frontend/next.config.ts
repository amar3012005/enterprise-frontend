import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/agents/:id',
        destination: 'http://127.0.0.1:8000/api/agents/:id',
      },
      {
        source: '/api/metrics',
        destination: 'http://127.0.0.1:8000/api/metrics/',
      },
    ];
  },
};

export default nextConfig;
