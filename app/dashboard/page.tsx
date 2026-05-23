import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getVendorOrders,
  getVendorProducts,
  getVendorStore,
  getVendorWhatsAppLinkStatus,
} from "@/lib/dashboard-data";
import { formatNaira } from "@/lib/format";
import { normalizeStoreTemplate } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const store = session?.user?.id ? await getVendorStore(session.user.id) : null;
  const products = session?.user?.id ? await getVendorProducts(session.user.id) : [];
  const orders = session?.user?.id ? await getVendorOrders(session.user.id) : [];
  const whatsappLinkStatus = session?.user?.id
    ? await getVendorWhatsAppLinkStatus(session.user.id)
    : { linked: null, pending_code: null };

  const confirmedOrders = orders.filter((item) => item.order.status === "confirmed");
  const totalRevenue = confirmedOrders.reduce(
    (sum, item) => sum + Number(item.order.total_amount ?? 0),
    0,
  );
  const pendingOrders = orders.filter(
    (item) => item.order.status === "pending_whatsapp",
  ).length;
  const templateLabel = store
    ? normalizeStoreTemplate(store.store_template).replace(/_/g, " ")
    : null;

  
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "vendor") {
    redirect("/");
  }

  return (
    <>
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Welcome back, {session.user.name ?? session.user.email?.split("@")[0] ?? "Vendor"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your storefront, products, and WhatsApp operations from one place.
          </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Store Status</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {store?.is_active ? "Active" : "Draft"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {store ? `Template: ${templateLabel}` : "No store configured yet."}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Products</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{products.length}</h2>
          <p className="mt-1 text-sm text-slate-600">Total catalog items.</p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Orders</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{pendingOrders}</h2>
          <p className="mt-1 text-sm text-slate-600">Awaiting vendor action.</p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Revenue</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {formatNaira(totalRevenue)}
          </h2>
          <p className="mt-1 text-sm text-slate-600">Confirmed orders only.</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Storefront</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Structure & Templates
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Configure store details, choose template style, and preview how products
            are displayed.
          </p>
          <Link
            href="/dashboard/store"
            className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
          >
            Open storefront settings
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Integrations</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            WhatsApp Link
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Bot status:{" "}
            <span className="font-semibold">
              {whatsappLinkStatus.linked?.is_active ? "Linked" : "Unlinked"}
            </span>
          </p>
          <Link
            href="/dashboard/integrations"
            className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
          >
            Open integrations
          </Link>
        </article>
      </section>
    </>
  );
}
