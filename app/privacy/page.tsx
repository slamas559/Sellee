import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read Sellee's privacy policy for how account, store, product, order, and WhatsApp automation data is collected and processed.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Sellee",
    description:
      "How Sellee collects, uses, and protects account, order, and WhatsApp workflow data.",
    url: "https://sellee.store/privacy",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Sellee",
    description:
      "How Sellee collects, uses, and protects account, order, and WhatsApp workflow data.",
  },
};

const effectiveDate = "April 20, 2026";

export default function PrivacyPage() {
  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy",
    url: "https://sellee.store/privacy",
    description:
      "Sellee privacy policy for account, store, order, and WhatsApp automation data handling.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }}
      />
      <LegalPage
        kicker="Sellee Legal"
        title="Privacy Policy"
        meta={`Effective date: ${effectiveDate}`}
        sections={[
          {
            id: "introduction",
            title: "Introduction",
            content: (
              <p>
                Sellee helps vendors create online store pages and manage orders with
                WhatsApp-powered messaging workflows. This policy explains what data we
                collect, why we collect it, and how we handle it.
              </p>
            ),
          },
          {
            id: "information-we-collect",
            title: "Information We Collect",
            content: (
              <>
                <p>We may collect and store:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Account data (email, password hash, phone number, role).</li>
                  <li>Store data (store name, slug, WhatsApp number, logo URL, theme settings).</li>
                  <li>Product data (name, description, price, images, stock).</li>
                  <li>Order data (customer name, customer WhatsApp, items, totals, status).</li>
                  <li>Payment and receipt metadata when enabled.</li>
                  <li>WhatsApp automation metadata needed to process commands and updates.</li>
                  <li>Technical logs for security, debugging, and abuse prevention.</li>
                </ul>
              </>
            ),
          },
          {
            id: "how-we-use-information",
            title: "How We Use Information",
            content: (
              <ul className="list-disc space-y-1 pl-5">
                <li>To provide and maintain Sellee services.</li>
                <li>To process store operations, orders, and status updates.</li>
                <li>To support WhatsApp command handling and notifications.</li>
                <li>To improve reliability, security, and performance.</li>
                <li>To comply with legal obligations.</li>
              </ul>
            ),
          },
          {
            id: "data-sharing",
            title: "Data Sharing",
            content: (
              <p>
                We do not sell personal data. We may share data with infrastructure and
                service providers required to operate Sellee, such as hosting,
                database, storage, and messaging providers.
              </p>
            ),
          },
          {
            id: "data-retention",
            title: "Data Retention",
            content: (
              <p>
                We retain data only as long as needed for service operation, legal
                compliance, dispute resolution, and security monitoring.
              </p>
            ),
          },
          {
            id: "security",
            title: "Security",
            content: (
              <p>
                We apply reasonable technical and organizational safeguards. No internet
                transmission or storage system is guaranteed to be fully secure.
              </p>
            ),
          },
          {
            id: "your-rights",
            title: "Your Rights",
            content: (
              <p>
                You may request access, correction, or deletion of your information.
                Please contact us using the details below.
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
            <Link href="/terms" className="text-emerald-700 hover:underline">
              Terms of Service
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
