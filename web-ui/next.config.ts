import type { NextConfig } from "next";

const API = process.env.GLASSBOX_API ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only the Jac/FastAPI decisioning endpoints are proxied to the backend, so
    // the browser stays same-origin. /api/banks is deliberately NOT listed — it
    // is served by the route handler in src/app/api/banks/, which is what lets
    // Bank match work on Vercel, where there is no Python process.
    return ["run", "graph", "lineage", "reset"].map((path) => ({
      source: `/api/${path}`,
      destination: `${API}/api/${path}`,
    }));
  },
};

export default nextConfig;
