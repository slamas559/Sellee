import type { Metadata } from "next";
import { EmailsPanel } from "@/components/admin-console/emails-panel";

export const metadata: Metadata = { title: "Email composer" };

export default function EmailsPage() {
  return (
    <div>
      <p className="atlas-kicker">Comms</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Email composer</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Sends immediately to the first batch; anything larger finishes via a background job.
      </p>
      <EmailsPanel />
    </div>
  );
}