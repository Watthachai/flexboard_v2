import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // ❌ Removed - incompatible with dynamic routes
  reactCompiler: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
