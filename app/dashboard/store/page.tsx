import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StoreSetupForm } from "@/components/dashboard/store-setup-form";
import { authOptions } from "@/lib/auth";
import { getUserEmailVerifiedAt, getVendorProducts, getVendorStore } from "@/lib/dashboard-data";
import { canUseAllStoreTemplates } from "@/lib/plans";
import { getEffectiveVendorId, getStaffPermissions } from "@/lib/staff";

export const metadata: Metadata = {
  title: "Storefront",
};

export default async function DashboardStorePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "staff") {
    const permissions = await getStaffPermissions(session.user.id);
    if (!permissions.store_settings) {
      redirect("/dashboard");
    }
  }

  const vendorId = getEffectiveVendorId(session);
  // Email verification is checked against the vendor's own account, not the
  // logged-in staff member's - it's a signal about the store, not the login.
  const [store, emailVerifiedAt] = vendorId
    ? await Promise.all([getVendorStore(vendorId), getUserEmailVerifiedAt(vendorId)])
    : [null, null];
  const canUseAllTemplates = vendorId ? await canUseAllStoreTemplates(vendorId) : true;
  // Used by the full-size template preview. Only products customers can see.
  const previewProducts = vendorId
    ? (await getVendorProducts(vendorId))
        .filter((p) => p.is_available)
        .slice(0, 12)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          category: p.category,
          brand: p.brand,
          price: p.price,
          compare_at_price: p.compare_at_price,
          image_url: p.image_url,
          image_urls: p.image_urls,
          rating_avg: p.rating_avg,
          rating_count: p.rating_count,
          stock_count: p.stock_count,
        }))
    : [];

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-emerald-700">Storefront Settings</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">
          Store Setup & Template
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage profile, location, and storefront template style from one place.
        </p>
      </header>
      <StoreSetupForm
        initialStore={store}
        initialEmailVerifiedAt={emailVerifiedAt}
        canUseAllStoreTemplates={canUseAllTemplates}
        previewProducts={previewProducts}
      />
    </section>
  );
}
