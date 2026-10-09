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

const effectiveDate = "October 9, 2026";

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
                  <li>
                    Verification data, only if you apply for a Verified badge: a photo of a
                    government-issued ID, a selfie holding that ID, the type of ID, the name
                    printed on it, and the bank account you receive payments into (bank,
                    account number, and the account name the bank returns).
                  </li>
                  <li>
                    Order confirmations and reviews, including which order a review relates to.
                  </li>
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
                <li>
                  To verify the identity of vendors who apply for a Verified badge, and to
                  prevent fraud, impersonation, and abuse.
                </li>
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
                database, storage, and messaging providers. We may also disclose
                information to law enforcement or regulators when the law requires it, or
                when it is necessary to investigate fraud or protect the safety of our users.
              </p>
            ),
          },
          {
            id: "data-retention",
            title: "Data Retention",
            content: (
              <>
                <p>
                  We retain data only as long as needed for service operation, legal
                  compliance, dispute resolution, and security monitoring.
                </p>
                <p>
                  Verification documents follow the specific schedule in the section
                  &ldquo;Vendor Verification and ID Documents&rdquo; below.
                </p>
              </>
            ),
          },
          {
            id: "vendor-verification",
            title: "Vendor Verification and ID Documents",
            content: (
              <>
                <p>
                  Verification is optional. You can sell on Sellee without it. If you apply
                  for a Verified badge, we ask for the information listed above so we can
                  confirm that a real, identifiable person or business is behind the store.
                </p>
                <p className="mt-3 font-medium">Why we collect it</p>
                <p>
                  To confirm your identity, to check that the bank account you receive
                  payments into is in your name, to protect buyers from fraud and
                  impersonation, and to handle disputes and investigations. We process it
                  because you choose to submit it and because we have a legitimate interest
                  in keeping buyers and vendors safe.
                </p>
                <p className="mt-3 font-medium">Who can see it</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Only authorised Sellee team members reviewing verification requests. Each
                    time ID photos are opened, the access is recorded in an audit log.
                  </li>
                  <li>
                    Your documents are stored privately and are never shown on your store,
                    in the marketplace, or to buyers. Buyers only see that a store is
                    Verified, Trusted, or a Top Seller.
                  </li>
                  <li>
                    To confirm your bank account name, we send your bank and account number
                    to our payment provider, Paystack.
                  </li>
                </ul>
                <p className="mt-3 font-medium">How long we keep it</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium">Approved:</span> ID photos are kept while
                    your account is active.
                  </li>
                  <li>
                    <span className="font-medium">Rejected:</span> ID photos are deleted
                    within about 30 days of the rejection.
                  </li>
                  <li>
                    <span className="font-medium">After your account is deleted:</span> ID
                    photos are kept for up to 24 months to help prevent fraud and handle
                    disputes, and are then permanently deleted.
                  </li>
                  <li>
                    A record that verification took place (the name on the ID, the type of
                    ID, dates, the outcome, and the reviewer) may be kept after the photos
                    are deleted, as an audit trail.
                  </li>
                  <li>
                    We may keep documents longer if they are needed for an investigation, a
                    dispute, or a legal request, or if the law requires it.
                  </li>
                </ul>
                <p className="mt-3">
                  You can ask us about earlier deletion at any time. We will consider each
                  request, but may decline where we have a legitimate reason to keep the
                  records, such as suspected fraud or a legal obligation.
                </p>
              </>
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
                Please contact us using the details below. Where we hold information for
                fraud prevention, an investigation, or a legal obligation (see &ldquo;Vendor
                Verification and ID Documents&rdquo;), we may be unable to delete it
                immediately, and we will tell you why.
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
