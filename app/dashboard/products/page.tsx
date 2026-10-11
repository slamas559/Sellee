import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProductsManager } from "@/components/dashboard/products-manager";
import { authOptions } from "@/lib/auth";
import { getVendorProducts, getVendorStore } from "@/lib/dashboard-data";
import { hasFeature, withinLimit } from "@/lib/plans";
import { getEffectiveVendorId, getStaffPermissions } from "@/lib/staff";

export const metadata: Metadata = {
  title: "Products",
};

export default async function DashboardProductsPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "staff") {
    const permissions = await getStaffPermissions(session.user.id);
    if (!permissions.products) {
      redirect("/dashboard");
    }
  }

  const vendorId = getEffectiveVendorId(session);
  const [products, store] = vendorId
    ? await Promise.all([getVendorProducts(vendorId), getVendorStore(vendorId)])
    : [[], null];
  const [promoPricingEnabled, canCreateProducts] = vendorId
    ? await Promise.all([
        hasFeature(vendorId, "promo_pricing"),
        withinLimit(vendorId, "max_products", products.length),
      ])
    : [false, false];

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-emerald-700">Products</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Catalog Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add, edit, and organize product listings for your storefront.
        </p>
      </header>
      <ProductsManager
        initialProducts={products}
        currency={store?.currency}
        initialPromoPricingEnabled={promoPricingEnabled}
        initialCanCreateProducts={canCreateProducts}
      />
    </section>
  );
}
