import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reverse proxy rewrite rule to bypass CORS policy during client-side browser fetches
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://aero-y6mm.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;
