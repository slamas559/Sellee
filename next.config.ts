import type { NextConfig } from "next";

const ngrokOrigin = process.env.NEXTAUTH_URL;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(ngrokOrigin ? [ngrokOrigin] : []),
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
