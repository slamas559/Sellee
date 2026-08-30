import type { Metadata } from "next";
import { AnalyticsPanel } from "@/components/admin-console/analytics-panel";

export const metadata: Metadata = { title: "Analytics & earnings" };

export default function AnalyticsPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Analytics & earnings</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Platform totals and per-vendor earnings, built on the same revenue definition as the
        vendor dashboard (confirmed and delivered orders only).
      </p>
      <AnalyticsPanel />
    </div>
  );
}