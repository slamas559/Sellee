import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorOrders, getVendorProducts } from "@/lib/dashboard-data";
import { formatNaira } from "@/lib/format";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OrderStatusChart } from "@/components/dashboard/order-status-chart";
import { OrderTrendsChart } from "@/components/dashboard/order-trends-chart";
import { ProductPerformanceChart } from "@/components/dashboard/product-performance-chart";
import {
  generateRevenueChartData,
  generateOrderStatusData,
  generateOrderTrendsData,
  generateProductPerformanceData,
} from "@/lib/chart-utils";

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
  // Fetch more orders for detailed analytics
  const orders = session?.user?.id ? await getVendorOrders(session.user.id, { limit: 200, offset: 0 }) : [];

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
    (sum, item) =>
      item.order.status === "confirmed"
        ? sum + Number(item.order.total_amount ?? 0)
        : sum,
    0,
  );
  const previousMonthlyRevenue = previousMonthlyOrders.reduce(
    (sum, item) =>
      item.order.status === "confirmed"
        ? sum + Number(item.order.total_amount ?? 0)
        : sum,
    0,
  );
  const confirmedMonthlyOrders = monthlyOrders.filter((item) => item.order.status === "confirmed");
  const confirmedPreviousMonthlyOrders = previousMonthlyOrders.filter(
    (item) => item.order.status === "confirmed",
  );

  const lowStock = products.filter((product) => product.stock_count <= 2).length;

  // Generate chart data
  const revenueChartData = generateRevenueChartData(orders);
  const orderStatusData = generateOrderStatusData(orders);
  const orderTrendsData = generateOrderTrendsData(orders);
  const productPerformanceData = generateProductPerformanceData(orders);

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
          <p className="mt-1 text-xs text-slate-500">
            Confirmed only ({confirmedMonthlyOrders.length} vs {confirmedPreviousMonthlyOrders.length})
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

      {/* Charts Grid */}
      <section className="grid gap-4 lg:grid-cols-2">
        {revenueChartData.length > 0 && <RevenueChart data={revenueChartData} />}
        {orderStatusData.length > 0 && <OrderStatusChart data={orderStatusData} />}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {orderTrendsData.length > 0 && <OrderTrendsChart data={orderTrendsData} />}
        {productPerformanceData.length > 0 && <ProductPerformanceChart data={productPerformanceData} />}
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


