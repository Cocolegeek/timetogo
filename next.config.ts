import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reuse visited pages from the client router cache: instant tab switches.
    staleTimes: { dynamic: 60, static: 300 },
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile photos
      },
    ],
  },
};

export default nextConfig;
