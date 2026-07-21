import type { NextConfig } from "next";

const apiTarget = process.env.AERO_API_URL || 'http://localhost:3000';
const formattedTarget = apiTarget.replace(/\/+$/, '');
const destination = formattedTarget.endsWith('/api/v1')
  ? `${formattedTarget}/:path*`
  : `${formattedTarget}/api/v1/:path*`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reverse proxy rewrite rule to bypass CORS policy during client-side browser fetches
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;

