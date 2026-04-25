import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorOrders, getVendorProducts } from "@/lib/dashboard-data";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = {
  title: "Analytics",
};

function calcGrowth(current: number, previous: number): string {
  if (previous <= 0) return "N/A";
  const growth = ((current - previous) / previous) * 100;
  const sign = growth >= 0 ? "+" : "";
  return `${sign}${growth.toFixed(1)}%`;
}

export default async function DashboardAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const products = session?.user?.id ? await getVendorProducts(session.user.id) : [];
  const orders = session?.user?.id ? await getVendorOrders(session.user.id) : [];

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  const monthlyOrders = orders.filter(({ order }) => {
    const date = new Date(order.created_at);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });
  const previousMonthlyOrders = orders.filter(({ order }) => {
    const date = new Date(order.created_at);
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  });

  const monthlyRevenue = monthlyOrders.reduce(
    (sum, item) => sum + Number(item.order.total_amount ?? 0),
    0,
  );
  const previousMonthlyRevenue = previousMonthlyOrders.reduce(
    (sum, item) => sum + Number(item.order.total_amount ?? 0),
    0,
  );

  const lowStock = products.filter((product) => product.stock_count <= 2).length;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Analytics</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Performance Snapshot</h1>
        <p className="mt-1 text-sm text-slate-600">
          Quick commercial metrics for this month and operational alerts.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monthly Revenue</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{formatNaira(monthlyRevenue)}</h2>
          <p className="mt-1 text-xs text-slate-500">
            vs last month: {calcGrowth(monthlyRevenue, previousMonthlyRevenue)}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monthly Orders</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{monthlyOrders.length}</h2>
          <p className="mt-1 text-xs text-slate-500">
            vs last month: {calcGrowth(monthlyOrders.length, previousMonthlyOrders.length)}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Catalog Size</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{products.length}</h2>
          <p className="mt-1 text-xs text-slate-500">Active products in your store.</p>
        </article>

        <article className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-900/80">Low Stock Alerts</p>
          <h2 className="mt-2 text-2xl font-black text-amber-950">{lowStock}</h2>
          <p className="mt-1 text-xs text-amber-900/80">Products with stock {"<="} 2.</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Top Recent Orders</p>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No orders yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.slice(0, 6).map(({ order }) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <p className="text-sm font-medium text-slate-900">
                  #{order.id.slice(0, 8).toUpperCase()} - {order.status}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatNaira(Number(order.total_amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

