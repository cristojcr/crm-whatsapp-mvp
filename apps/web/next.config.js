/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['supabase.co', 'googleapis.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/webhook/:path*',
        destination: 'http://localhost:3001/webhook/:path*',
      },
    ];
  },
};

module.exports = nextConfig;