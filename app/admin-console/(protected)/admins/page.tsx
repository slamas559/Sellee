import type { Metadata } from "next";
import { AdminsPanel } from "@/components/admin-console/admins-panel";

export const metadata: Metadata = { title: "Admins" };

export default function AdminsPage() {
  return (
    <div>
      <p className="atlas-kicker">Console</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Admins</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Invite trusted people, and revoke access when it&apos;s no longer needed.
      </p>
      <AdminsPanel />
    </div>
  );
}
