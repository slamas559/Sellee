import type { Metadata } from "next";
import { AnalyticsPanel } from "@/components/admin-console/analytics-panel";
import { BillingPanel } from "@/components/admin-console/billing-panel";

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
      <h2 className="atlas-display text-[18px] font-medium">Subscription revenue</h2>
      <p className="mt-1 mb-4 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        What vendors pay Sellee for their plan Sellee's own revenue as a business.
      </p>
      <BillingPanel />

      <div className="mt-10 mb-4 border-t pt-6" style={{ borderColor: "var(--atlas-line)" }}>
        <h2 className="atlas-display text-[18px] font-medium">Marketplace analytics</h2>
        <p className="mt-1 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
          Vendor/marketplace order revenue (GMV) and platform activity — money vendors earn from
          their own customers, separate from Sellee's subscription revenue above.
        </p>
      </div>
      <AnalyticsPanel />
    </div>
  );
}