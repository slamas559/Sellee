import type { NextConfig } from "next";
import { getImageRemotePatterns } from "./lib/image-hosts";

const ngrokOrigin = process.env.NEXTAUTH_URL;


const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(ngrokOrigin ? [ngrokOrigin] : []),
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Only images from our own storage and the stock-photo hosts we use are
    // allowed through the optimizer. A wildcard here lets anyone proxy
    // arbitrary images through (and bill) the site.
    remotePatterns: getImageRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          // Deliberately not a full script CSP (Next inlines scripts and you may load
          // third-party ones); this subset blocks clickjacking and <base>/plugin tricks.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
      {
        source: "/:path*/opengraph-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          {
            key: "Access-Control-Allow-Origin", 
            value: "*",
          },
        ],
      },
    ];
  }
};

export default nextConfig;
