import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review Sellee's terms of service for storefront management, marketplace usage, and WhatsApp-assisted commerce workflows.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | Sellee",
    description:
      "Terms governing Sellee marketplace usage, vendor responsibilities, and WhatsApp-assisted workflows.",
    url: "https://sellee.store/terms",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | Sellee",
    description:
      "Terms governing Sellee marketplace usage, vendor responsibilities, and WhatsApp-assisted workflows.",
  },
};

const effectiveDate = "April 20, 2026";

export default function TermsPage() {
  const termsJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service",
    url: "https://sellee.store/terms",
    description:
      "Sellee terms covering storefront, marketplace, and WhatsApp-assisted order workflows.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }}
      />
      <LegalPage
        kicker="Sellee Legal"
        title="Terms of Service"
        meta={`Effective date: ${effectiveDate}`}
        sections={[
          {
            id: "acceptance",
            title: "Acceptance",
            content: (
              <p>
                By accessing or using Sellee, you agree to these Terms of Service.
                If you do not agree, do not use the platform.
              </p>
            ),
          },
          {
            id: "service-scope",
            title: "Service Scope",
            content: (
              <p>
                Sellee provides tools for storefront management, product listing,
                order tracking, and WhatsApp-assisted communication workflows.
              </p>
            ),
          },
          {
            id: "account-responsibilities",
            title: "Account Responsibilities",
            content: (
              <ul className="list-disc space-y-1 pl-5">
                <li>You are responsible for account credentials and account activity.</li>
                <li>You must provide accurate business and contact information.</li>
                <li>You must comply with applicable laws and messaging platform policies.</li>
              </ul>
            ),
          },
          {
            id: "prohibited-use",
            title: "Prohibited Use",
            content: (
              <ul className="list-disc space-y-1 pl-5">
                <li>Spam, fraudulent activity, or deceptive communications.</li>
                <li>Violations of WhatsApp, payment, or hosting provider policies.</li>
                <li>Attempts to compromise platform security or abuse system resources.</li>
              </ul>
            ),
          },
          {
            id: "fees-and-billing",
            title: "Fees and Billing",
            content: (
              <p>
                Paid features may be introduced over time. Any pricing, billing terms,
                and trial terms will be shown before purchase or renewal.
              </p>
            ),
          },
          {
            id: "availability-and-changes",
            title: "Availability and Changes",
            content: (
              <p>
                We may update, suspend, or discontinue parts of the service, with or
                without notice, as needed for maintenance, legal compliance, or product
                changes.
              </p>
            ),
          },
          {
            id: "limitation-of-liability",
            title: "Limitation of Liability",
            content: (
              <p>
                Sellee is provided on an &quot;as is&quot; basis. To the maximum extent
                permitted by law, we are not liable for indirect, incidental, or
                consequential damages arising from service use.
              </p>
            ),
          },
          {
            id: "termination",
            title: "Termination",
            content: (
              <p>
                We may suspend or terminate access for violations of these terms,
                platform abuse, or legal requirements.
              </p>
            ),
          },
          {
            id: "contact",
            title: "Contact",
            content: (
              <p>
                Contact:{" "}
                <a href="mailto:support@sellee.store" className="font-medium text-emerald-700 hover:underline">
                  support@sellee.store
                </a>
              </p>
            ),
          },
        ]}
        footer={
          <p className="text-xs text-slate-500">
            Also see{" "}
            <Link href="/privacy" className="text-emerald-700 hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/data-deletion" className="text-emerald-700 hover:underline">
              Data Deletion Instructions
            </Link>
            .
          </p>
        }
      />
    </>
  );
}
