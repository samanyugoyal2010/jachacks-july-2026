import type { NextConfig } from "next";

const API = process.env.GLASSBOX_API ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    // proxy to the Jac/FastAPI backend so the browser stays same-origin
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
