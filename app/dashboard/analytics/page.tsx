import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveVendorId, getStaffPermissions } from "@/lib/staff";
import {
  getVendorOrders,
  getVendorProducts,
  getVendorCustomerFirstOrderMap,
  getVendorStoreVisits,
  getVendorStore,
} from "@/lib/dashboard-data";
import { formatDuration } from "@/lib/format";
import { formatPrice } from "@/lib/currency";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OrderStatusChart } from "@/components/dashboard/order-status-chart";
import { OrderTrendsChart } from "@/components/dashboard/order-trends-chart";
import { ProductPerformanceChart } from "@/components/dashboard/product-performance-chart";
import { VisitsChart } from "@/components/dashboard/visits-chart";
import { AnalyticsRangeFilter } from "@/components/dashboard/analytics-range-filter";
import { getAnalyticsRange, parseRangeKey } from "@/lib/date-range";
import { computeVendorPeriodMetrics } from "@/lib/vendor-metrics";
import { computeProductInsights } from "@/lib/product-insights";
import { hasFeature } from "@/lib/plans";
import {
  generateRevenueChartData,
  generateOrderStatusData,
  generateOrderTrendsData,
  generateProductPerformanceData,
  generateVisitsChartData,
} from "@/lib/chart-utils";
import { BarChart3, Eye, Package, ShoppingCart, TriangleAlert, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics",
};

function calcGrowth(current: number, previous: number): string {
  if (previous <= 0) return "N/A";
  const growth = ((current - previous) / previous) * 100;
  const sign = growth >= 0 ? "+" : "";
  return `${sign}${growth.toFixed(1)}%`;
}

function TrendComparison({
  label,
  current,
  previous,
}: {
  label?: string;
  current: number;
  previous: number;
}) {
  if (!label) return <p className="mt-2 text-xs text-slate-500">&nbsp;</p>;

  if (previous <= 0) {
    return <p className="mt-2 text-xs text-slate-500">{label}: new data</p>;
  }

  const isGrowing = current > previous;
  const isFalling = current < previous;
  const tone = isGrowing
    ? "bg-emerald-50 text-emerald-700"
    : isFalling
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-600";
  const icon = isGrowing ? "↑" : isFalling ? "↓" : "→";

  return (
    <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>
      <span aria-hidden="true">{icon}</span>
      {label}: {calcGrowth(current, previous)}
    </p>
  );
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "staff") {
    const permissions = await getStaffPermissions(session.user.id);
    if (!permissions.analytics) {
      redirect("/dashboard");
    }
  }

  const vendorId = getEffectiveVendorId(session);
  if (vendorId && !(await hasFeature(vendorId, "advanced_analytics"))) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Plan feature
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          Advanced analytics is locked
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upgrade to a plan that includes advanced analytics to view performance metrics and reports.
        </p>
        <Link
          href="/dashboard/plans"
          className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          View plans
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const rangeKey = parseRangeKey(params?.range);
  const range = getAnalyticsRange(rangeKey, new Date(), { from: params?.from, to: params?.to });

  const products = vendorId ? await getVendorProducts(vendorId) : [];
  const store = vendorId ? await getVendorStore(vendorId) : null;

  const orders = vendorId
    ? await getVendorOrders(vendorId, { from: range.from, to: range.to })
    : [];

  const previousOrders =
    vendorId && range.previousFrom
      ? await getVendorOrders(vendorId, { from: range.previousFrom, to: range.previousTo })
      : [];

  const customerFirstOrderMap = vendorId
    ? await getVendorCustomerFirstOrderMap(vendorId)
    : new Map<string, Date>();

  const metrics = computeVendorPeriodMetrics(orders, range, customerFirstOrderMap);
  const previousMetrics = computeVendorPeriodMetrics(previousOrders, range, customerFirstOrderMap);

  const visits = vendorId
    ? await getVendorStoreVisits(vendorId, { from: range.from, to: range.to })
    : [];
  const previousVisits =
    vendorId && range.previousFrom
      ? await getVendorStoreVisits(vendorId, { from: range.previousFrom, to: range.previousTo })
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
  const exportParams = new URLSearchParams({ range: rangeKey });
  if (params?.from) exportParams.set("from", params.from);
  if (params?.to) exportParams.set("to", params.to);

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-700">Analytics</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Performance Snapshot</h1>
            <p className="mt-1 text-sm text-slate-600">
              Commercial metrics for {range.label.toLowerCase()} and operational alerts.
            </p>
          </div>
          <div className="ml-auto flex w-full flex-nowrap items-center justify-end gap-2 sm:ml-0 sm:w-auto sm:flex-wrap">
            {vendorId && (await hasFeature(vendorId, "exportable_reports")) ? (
              <a
                href={`/api/dashboard/analytics/export?${exportParams.toString()}`}
                className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-3 sm:text-sm"
              >
                Export report
              </a>
            ) : null}
            <AnalyticsRangeFilter active={rangeKey} customFrom={params?.from} customTo={params?.to} />
          </div>
        </div>
      </header>

      {/* Core stat cards — 2-up on mobile, 4-up from xl */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500"><BarChart3 className="h-4 w-4" aria-hidden="true" />Revenue</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{formatPrice(revenue, store?.currency)}</h2>
          <TrendComparison label={range.comparisonLabel} current={revenue} previous={previousRevenue} />
          <p className="mt-1 text-xs text-slate-500">
            Confirmed/delivered only ({confirmedOrders.length}
            {range.comparisonLabel ? ` vs ${confirmedPreviousOrders.length}` : ""})
          </p>
        </article>

        <article className="rounded-lg border border-sky-100 bg-sky-50/30 p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500"><ShoppingCart className="h-4 w-4" aria-hidden="true" />Orders</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{orders.length}</h2>
          <TrendComparison label={range.comparisonLabel} current={orders.length} previous={previousOrders.length} />
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500"><Package className="h-4 w-4" aria-hidden="true" />Catalog Size</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{products.length}</h2>
          <p className="mt-1 text-xs text-slate-500">Active products in your store.</p>
        </article>

        <article className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm text-amber-900/80"><TriangleAlert className="h-4 w-4" aria-hidden="true" />Low Stock Alerts</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-amber-950">{lowStock}</h2>
          <p className="mt-1 text-xs text-amber-900/80">Products with stock {"<="} 2.</p>
        </article>
      </section>

      {/* Traffic stat cards — 2-up on mobile, 4-up from xl. Conversion card spans
          both columns unconditionally so it doesn't sit alone with empty space
          beside it on narrow screens. */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-lg border border-cyan-100 bg-cyan-50/30 p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500"><Eye className="h-4 w-4" aria-hidden="true" />Store Visits</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{visits.length}</h2>
          <TrendComparison label={range.comparisonLabel} current={visits.length} previous={previousVisits.length} />
        </article>

        <article className="rounded-lg border border-violet-100 bg-violet-50/30 p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500"><Users className="h-4 w-4" aria-hidden="true" />Unique Visitors</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{uniqueVisitors}</h2>
          <TrendComparison label={range.comparisonLabel} current={uniqueVisitors} previous={previousUniqueVisitors} />
        </article>

        <article className="col-span-2 rounded-lg border border-cyan-100 bg-white p-5">
          <p className="text-sm text-slate-500">Visitor → Buyer Conversion</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">
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
          <div className="rounded-lg border border-slate-200 bg-white p-5">
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

      
      <section className="rounded-lg border border-slate-200 bg-white p-5">
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
      

      {/* Fulfillment/customer stat cards — 2-up on mobile, 4-up from xl */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-5">
          <p className="text-sm text-slate-500">Avg. Order Value</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{formatPrice(metrics.aov, store?.currency)}</h2>
          <TrendComparison label={range.comparisonLabel} current={metrics.aov} previous={previousMetrics.aov} />
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Repeat Customer Rate</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">
            {metrics.uniqueCustomers > 0 ? `${(metrics.repeatRate * 100).toFixed(0)}%` : "—"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.uniqueCustomers > 0
              ? `${metrics.repeatCustomers} repeat, ${metrics.newCustomers} new of ${metrics.uniqueCustomers} buyers`
              : "No paying customers in this period."}
          </p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Avg. Time to Confirm</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">
            {metrics.avgConfirmMs !== null ? formatDuration(metrics.avgConfirmMs) : "—"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.avgConfirmMs !== null
              ? "From order placed to confirmed."
              : "Not enough data yet — accrues as you confirm orders."}
          </p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Avg. Time to Deliver</p>
          <h2 className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">
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
        <RevenueChart data={revenueChartData} rangeLabel={range.label} currency={store?.currency} />
        <OrderStatusChart data={orderStatusData} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <OrderTrendsChart data={orderTrendsData} />
        <ProductPerformanceChart data={productPerformanceData} currency={store?.currency} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-emerald-700">Top Recent Orders</p>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No orders in this period.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.slice(0, 6).map(({ order, items }) => {
              const firstItem = items[0];
              return (
                <div
                  key={order.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  {firstItem?.image_url ? (
                    <Image
                      src={firstItem.image_url}
                      alt={firstItem.product_name}
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"
                    >
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {firstItem?.product_name ?? "Order"}{items.length > 1 ? ` + ${items.length - 1} more` : ""}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">
                      #{order.id.slice(0, 8).toUpperCase()} · {order.status}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-700">
                    {formatPrice(Number(order.total_amount), store?.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
