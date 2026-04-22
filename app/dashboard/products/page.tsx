import { getServerSession } from "next-auth";
import { ProductsManager } from "@/components/dashboard/products-manager";
import { authOptions } from "@/lib/auth";
import { getVendorProducts } from "@/lib/dashboard-data";

export default async function DashboardProductsPage() {
  const session = await getServerSession(authOptions);
  const products = session?.user?.id ? await getVendorProducts(session.user.id) : [];

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Products</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Catalog Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add, edit, and organize product listings for your storefront.
        </p>
      </header>
      <ProductsManager initialProducts={products} />
    </section>
  );
}
