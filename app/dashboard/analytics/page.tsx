import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getVendorOrders,
  getVendorProducts,
  getVendorCustomerFirstOrderMap,
  getVendorStoreVisits,
} from "@/lib/dashboard-data";
import { formatNaira, formatDuration } from "@/lib/format";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OrderStatusChart } from "@/components/dashboard/order-status-chart";
import { OrderTrendsChart } from "@/components/dashboard/order-trends-chart";
import { ProductPerformanceChart } from "@/components/dashboard/product-performance-chart";
import { VisitsChart } from "@/components/dashboard/visits-chart";
import { AnalyticsRangeFilter } from "@/components/dashboard/analytics-range-filter";
import { getAnalyticsRange, parseRangeKey } from "@/lib/date-range";
import { computeVendorPeriodMetrics } from "@/lib/vendor-metrics";
import { computeProductInsights } from "@/lib/product-insights";
import {
  generateRevenueChartData,
  generateOrderStatusData,
  generateOrderTrendsData,
  generateProductPerformanceData,
  generateVisitsChartData,
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

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const rangeKey = parseRangeKey(params?.range);
  const range = getAnalyticsRange(rangeKey, new Date(), { from: params?.from, to: params?.to });

  const products = session?.user?.id ? await getVendorProducts(session.user.id) : [];

  const orders = session?.user?.id
    ? await getVendorOrders(session.user.id, { from: range.from, to: range.to })
    : [];

  const previousOrders =
    session?.user?.id && range.previousFrom
      ? await getVendorOrders(session.user.id, { from: range.previousFrom, to: range.previousTo })
      : [];

  const customerFirstOrderMap = session?.user?.id
    ? await getVendorCustomerFirstOrderMap(session.user.id)
    : new Map<string, Date>();

  const metrics = computeVendorPeriodMetrics(orders, range, customerFirstOrderMap);
  const previousMetrics = computeVendorPeriodMetrics(previousOrders, range, customerFirstOrderMap);

  const visits = session?.user?.id
    ? await getVendorStoreVisits(session.user.id, { from: range.from, to: range.to })
    : [];
  const previousVisits =
    session?.user?.id && range.previousFrom
      ? await getVendorStoreVisits(session.user.id, { from: range.previousFrom, to: range.previousTo })
      : [];

  const uniqueVisitors = new Set(visits.map((v) => v.visitor_id)).size;
  const previousUniqueVisitors = new Set(previousVisits.map((v) => v.visitor_id)).size;
  const conversionRate = uniqueVisitors > 0 ? (metrics.uniqueCustomers / uniqueVisitors) * 100 : 0;

  const visitsBySource = visits.reduce<Record<string, number>>((acc, v) => {
    const key = v.source || "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(visitsBySource).sort((a, b) => b[1] - a[1]);

  const productInsights = computeProductInsights(visits, orders, products).slice(0, 8);

  const revenue = orders.reduce(
    (sum, item) =>
      item.order.status === "confirmed" || item.order.status === "delivered"
        ? sum + Number(item.order.total_amount ?? 0)
        : sum,
    0,
  );
  const previousRevenue = previousOrders.reduce(
    (sum, item) =>
      item.order.status === "confirmed" || item.order.status === "delivered"
        ? sum + Number(item.order.total_amount ?? 0)
        : sum,
    0,
  );
  const confirmedOrders = orders.filter(
    (item) => item.order.status === "confirmed" || item.order.status === "delivered",
  );
  const confirmedPreviousOrders = previousOrders.filter(
    (item) => item.order.status === "confirmed" || item.order.status === "delivered",
  );

  const lowStock = products.filter((product) => product.stock_count <= 2).length;

  // Generate chart data, bucketed by the selected range's granularity
  const revenueChartData = generateRevenueChartData(orders, range);
  const orderStatusData = generateOrderStatusData(orders);
  const orderTrendsData = generateOrderTrendsData(orders, range);
  const productPerformanceData = generateProductPerformanceData(orders);
  const visitsChartData = generateVisitsChartData(visits, range);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-700">Analytics</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Performance Snapshot</h1>
            <p className="mt-1 text-sm text-slate-600">
              Commercial metrics for {range.label.toLowerCase()} and operational alerts.
            </p>
          </div>
          <AnalyticsRangeFilter active={rangeKey} customFrom={params?.from} customTo={params?.to} />
        </div>
      </header>

      {/* Core stat cards — 2-up on mobile, 4-up from xl */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Revenue</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{formatNaira(revenue)}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {range.comparisonLabel ? `${range.comparisonLabel}: ${calcGrowth(revenue, previousRevenue)}` : "\u00A0"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Confirmed/delivered only ({confirmedOrders.length}
            {range.comparisonLabel ? ` vs ${confirmedPreviousOrders.length}` : ""})
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Orders</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{orders.length}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {range.comparisonLabel
              ? `${range.comparisonLabel}: ${calcGrowth(orders.length, previousOrders.length)}`
              : "\u00A0"}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Catalog Size</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{products.length}</h2>
          <p className="mt-1 text-xs text-slate-500">Active products in your store.</p>
        </article>

        <article className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-900/80">Low Stock Alerts</p>
          <h2 className="mt-2 text-xl font-black text-amber-950">{lowStock}</h2>
          <p className="mt-1 text-xs text-amber-900/80">Products with stock {"<="} 2.</p>
        </article>
      </section>

      {/* Traffic stat cards — 2-up on mobile, 4-up from xl. Conversion card spans
          both columns unconditionally so it doesn't sit alone with empty space
          beside it on narrow screens. */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-xl border border-cyan-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Store Visits</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{visits.length}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {range.comparisonLabel
              ? `${range.comparisonLabel}: ${calcGrowth(visits.length, previousVisits.length)}`
              : "\u00A0"}
          </p>
        </article>

        <article className="rounded-xl border border-cyan-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Unique Visitors</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{uniqueVisitors}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {range.comparisonLabel
              ? `${range.comparisonLabel}: ${calcGrowth(uniqueVisitors, previousUniqueVisitors)}`
              : "\u00A0"}
          </p>
        </article>

        <article className="col-span-2 rounded-xl border border-cyan-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Visitor → Buyer Conversion</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            {uniqueVisitors > 0 ? `${conversionRate.toFixed(1)}%` : "—"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {uniqueVisitors > 0
              ? `${metrics.uniqueCustomers} of ${uniqueVisitors} visitors placed a confirmed order.`
              : "No visit data yet for this period."}
          </p>
        </article>
      </section>

      {visitsChartData.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VisitsChart data={visitsChartData} rangeLabel={range.label} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">Traffic Sources</p>
            {topSources.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No visits in this period.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {topSources.map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-700">{source}</span>
                    <span className="font-semibold text-slate-900">
                      {count} ({((count / visits.length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Product Interest vs Conversion</p>
          <p className="mt-1 text-xs text-slate-500">
            How many people viewed each product&apos;s page vs how many of them actually ordered. Products
            flagged &quot;Needs attention&quot; have real traffic but a low conversion rate — often a sign
            the price, photos, or description need a second look.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Product</th>
                  <th className="py-2 pr-4 font-medium">Viewers</th>
                  <th className="py-2 pr-4 font-medium">Orders</th>
                  <th className="py-2 pr-4 font-medium">Conversion</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {productInsights.map((p) => (
                  <tr key={p.productId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900">{p.productName}</td>
                    <td className="py-2 pr-4 text-slate-700">{p.uniqueViewers}</td>
                    <td className="py-2 pr-4 text-slate-700">{p.ordersCount}</td>
                    <td className="py-2 pr-4 text-slate-700">
                      {p.uniqueViewers > 0 ? `${(p.conversionRate * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2">
                      {p.needsAttention && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Needs attention
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )

      {/* Fulfillment/customer stat cards — 2-up on mobile, 4-up from xl */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg. Order Value</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">{formatNaira(metrics.aov)}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {range.comparisonLabel
              ? `${range.comparisonLabel}: ${calcGrowth(metrics.aov, previousMetrics.aov)}`
              : "\u00A0"}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Repeat Customer Rate</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            {metrics.uniqueCustomers > 0 ? `${(metrics.repeatRate * 100).toFixed(0)}%` : "—"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.uniqueCustomers > 0
              ? `${metrics.repeatCustomers} repeat, ${metrics.newCustomers} new of ${metrics.uniqueCustomers} buyers`
              : "No paying customers in this period."}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg. Time to Confirm</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            {metrics.avgConfirmMs !== null ? formatDuration(metrics.avgConfirmMs) : "—"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.avgConfirmMs !== null
              ? "From order placed to confirmed."
              : "Not enough data yet — accrues as you confirm orders."}
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg. Time to Deliver</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            {metrics.avgDeliveryMs !== null ? formatDuration(metrics.avgDeliveryMs) : "—"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.avgDeliveryMs !== null
              ? "From confirmed to delivered."
              : "Not enough data yet — accrues as you mark orders delivered."}
          </p>
        </article>
      </section>

      {/* Charts Grid */}
      <section className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={revenueChartData} rangeLabel={range.label} />
        <OrderStatusChart data={orderStatusData} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <OrderTrendsChart data={orderTrendsData} />
        <ProductPerformanceChart data={productPerformanceData} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Top Recent Orders</p>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No orders in this period.</p>
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