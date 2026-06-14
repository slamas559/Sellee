// app/opengraph-image.tsx
// This file generates the default OG image for sellee.store
// WhatsApp, Twitter, Facebook, iMessage will all show this when sharing the homepage.
// Next.js serves it automatically at /opengraph-image (no route needed).

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sellee — Discover Local Vendors and Products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #065f46 0%, #047857 40%, #059669 70%, #10b981 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "rgba(16,185,129,0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "rgba(245,158,11,0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "40px",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* WhatsApp icon strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "16px", fontWeight: 600 }}>
              WhatsApp-powered ordering
            </span>
          </div>
        </div>

        {/* Main logo text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 900,
              color: "#059669",
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            Sellee
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.92)",
            margin: "0 0 12px 0",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Discover trusted local vendors and products
        </p>
        <p
          style={{
            fontSize: "20px",
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            margin: 0,
            textAlign: "center",
          }}
        >
          Browse categories · Compare stores · Order via WhatsApp
        </p>

        {/* Bottom pill */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "100px",
            padding: "8px 20px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px" }}>
            sellee.store
          </span>
        </div>
      </div>
    ),
    { ...size,
      headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, immutable, max-age=31536000",
    },
     },
  );
}