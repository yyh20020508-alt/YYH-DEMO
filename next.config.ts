import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["172.26.11.166"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
