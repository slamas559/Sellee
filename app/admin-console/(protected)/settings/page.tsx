import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin-console/settings-panel";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Settings</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Platform-wide switches. Changes here affect every vendor immediately.
      </p>
      <SettingsPanel />
    </div>
  );
}