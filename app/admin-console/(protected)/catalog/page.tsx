import type { Metadata } from "next";
import { CatalogPanel } from "@/components/admin-console/catalog-panel";

export const metadata: Metadata = { title: "Catalog" };

export default function CatalogPage() {
  return (
    <div>
      <p className="atlas-kicker">Platform</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Catalog</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Manage niches and categories used across the marketplace.
      </p>
      <CatalogPanel />
    </div>
  );
}
