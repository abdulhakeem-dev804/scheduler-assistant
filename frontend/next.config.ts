import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment with standalone output
  output: 'standalone',
};

export default nextConfig;
