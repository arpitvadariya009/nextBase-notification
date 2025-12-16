import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Add this to allow external images if needed
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;