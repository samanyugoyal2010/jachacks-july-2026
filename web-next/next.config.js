/** @type {import('next').NextConfig} */
const API = process.env.GLASSBOX_API || "http://127.0.0.1:8000";
module.exports = {
  async rewrites() {
    // Proxy API calls to the FastAPI backend so the browser stays same-origin.
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};
