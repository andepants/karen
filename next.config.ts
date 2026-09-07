import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 30,
    imageSizes: [48, 56, 64, 96, 112, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
      { protocol: "https", hostname: "aaobgyn.com" },
      { protocol: "https", hostname: "www.aaobgyn.com" },
    ],
  },
};

export default nextConfig;
