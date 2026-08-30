import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersPanel } from "@/components/admin-console/orders-panel";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Orders</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Every order across every store. Read-only for now — status changes still happen from the
        vendor&apos;s own dashboard.
      </p>
      <Suspense fallback={<p style={{ color: "var(--atlas-text-muted)" }}>Loading…</p>}>
        <OrdersPanel />
      </Suspense>
    </div>
  );
}