import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import SiteHeader from "@/components/layout/site-header";

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
    template: "Sellee | %s",
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

export default function RootLayout({
  children,
  searchParams,
}: Readonly<{
  children: React.ReactNode;
  searchParams?: Record<string, unknown>;
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
              <SiteHeader searchParams={Promise.resolve(searchParams ?? {})} />
              {children}
            </div>
            <ConditionalFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
