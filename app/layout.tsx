export const dynamic = 'force-dynamic'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import SiteHeader from "@/components/layout/site-header";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sellee.store"),
  title: {
    default: "Sellee",
    template: "%s | Sellee",
  },
  description:
    "Sellee is a local marketplace with WhatsApp-powered selling workflows for vendors and customers.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Sellee",
    description:
      "Discover nearby vendors, compare products, and manage orders with WhatsApp-powered workflows.",
    url: "https://sellee.store",
    siteName: "Sellee",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellee",
    description:
      "Discover nearby vendors, compare products, and manage orders with WhatsApp-powered workflows.",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/icon.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/icon.png", type: "image/png", sizes: "180x180" }],
  },
};

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center gap-4" />
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="flex min-h-full flex-col">
            <div className="flex-1">
              <Suspense fallback={<HeaderFallback />}>
                <SiteHeader />
              </Suspense>
              {children}
            </div>
            <ConditionalFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}