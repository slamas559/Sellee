import type { Metadata } from "next";
import { UsersPanel } from "@/components/admin-console/users-panel";

export const metadata: Metadata = { title: "Users & vendors" };

export default function UsersPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Users & vendors</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Suspend an account to reverse it later, or delete it outright when you&apos;re sure.
      </p>
      <UsersPanel />
    </div>
  );
}
