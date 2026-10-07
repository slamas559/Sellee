import type { Metadata } from "next";
import { VerificationsPanel } from "@/components/admin-console/verifications-panel";

export const metadata: Metadata = { title: "Vendor verification" };

export default function VerificationsPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Vendor verification</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Review ID submissions. Compare the photo with the name the vendor typed and the name their bank returned.
        Opening the photos is recorded in the audit log.
      </p>
      <VerificationsPanel />
    </div>
  );
}
