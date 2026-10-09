import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Data Deletion Instructions",
  description: "How to request account and data deletion on Sellee",
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      kicker="Sellee Legal"
      title="Data Deletion Instructions"
      meta="Use these steps to request deletion of your Sellee account data."
      sections={[
        {
          id: "how-to-request",
          title: "How to Request Deletion",
          content: (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Send an email to{" "}
                <a href="mailto:support@sellee.store" className="font-medium text-emerald-700 hover:underline">
                  support@sellee.store
                </a>
                .
              </li>
              <li>
                Use subject: <span className="font-medium">Data Deletion Request</span>.
              </li>
              <li>Include your account email and registered phone number.</li>
            </ol>
          ),
        },
        {
          id: "what-we-delete",
          title: "What We Delete",
          content: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Account profile data linked to your identity.</li>
              <li>Store and product records owned by your account.</li>
              <li>Order-related data and linked operational metadata where permitted.</li>
              <li>WhatsApp linking records associated with your vendor account.</li>
            </ul>
          ),
        },
        {
          id: "verification-documents",
          title: "Verification Documents",
          content: (
            <>
              <p>
                If you submitted an ID and selfie for a Verified badge, those photos are
                handled separately. After your account is deleted we keep them for up to 24
                months to help prevent fraud and handle disputes, then permanently delete
                them. A record that verification took place (the name on the ID, ID type,
                dates and outcome) may be kept as an audit trail.
              </p>
              <p className="mt-3">
                You can ask for earlier deletion. We will consider each request, but may keep
                documents where we are investigating suspected fraud, handling a dispute, or
                are legally required to. See our{" "}
                <Link href="/privacy#vendor-verification" className="text-emerald-700 hover:underline">
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>
            </>
          ),
        },
        {
          id: "timeline",
          title: "Timeline",
          content: (
            <p>
              Verified deletion requests are processed within 30 days, except where
              longer retention is legally required (for example fraud prevention,
              security investigations, or tax/legal compliance).
            </p>
          ),
        },
        {
          id: "verification",
          title: "Verification",
          content: (
            <p>
              We may ask for additional verification to protect accounts from
              unauthorized deletion requests.
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
          <Link href="/terms" className="text-emerald-700 hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      }
    />
  );
}
