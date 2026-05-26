import type { Metadata } from "next";
import { HelpCenterClient } from "@/components/help/help-center-client";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Get help with Sellee marketplace shopping, vendor setup, WhatsApp orders, account issues, and support contact options.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Center | Sellee",
    description:
      "Search support answers and contact Sellee by phone, WhatsApp, or email.",
    url: "https://sellee.store/help",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Help Center | Sellee",
    description:
      "Search support answers and contact Sellee by phone, WhatsApp, or email.",
  },
};

export default function HelpPage() {
  const helpJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Sellee Help Center",
    url: "https://sellee.store/help",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+2348100596007",
      contactType: "customer support",
      email: "support@sellee.store",
      areaServed: "NG",
      availableLanguage: "English",
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-8 lg:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(helpJsonLd) }}
      />
      <HelpCenterClient />
    </main>
  );
}

