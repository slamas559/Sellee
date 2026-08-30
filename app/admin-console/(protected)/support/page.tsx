import type { Metadata } from "next";
import { SupportPanel } from "@/components/admin-console/support-panel";

export const metadata: Metadata = { title: "Support & moderation" };

export default function SupportPage() {
  return (
    <div>
      <p className="atlas-kicker">Comms</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Support & moderation</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Help Center submissions and reported product listings. Marking a report &quot;actioned&quot;
        doesn&apos;t automatically remove anything — handle the actual removal from Users &amp;
        Vendors or Catalog, then mark it here.
      </p>
      <SupportPanel />
    </div>
  );
}