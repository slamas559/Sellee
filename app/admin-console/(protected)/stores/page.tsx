import type { Metadata } from "next";
import { StoresPanel } from "@/components/admin-console/stores-panel";

export const metadata: Metadata = { title: "Vendor stores" };

export default function VendorStoresPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Vendor stores</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Review store and owner details, open storefronts, and control each store&apos;s visibility.
      </p>
      <StoresPanel />
    </div>
  );
}
