import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // ❌ Removed - incompatible with dynamic routes
  output: "standalone", // ✅ For Docker deployment
  reactCompiler: true,
  allowedDevOrigins: ["172.168.1.135"],
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
