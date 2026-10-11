import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { hasFeature } from "@/lib/plans";
import { getVendorCustomerFirstOrderMap, getVendorOrders, getVendorProducts, getVendorStore, getVendorStoreVisits } from "@/lib/dashboard-data";
import { computeVendorPeriodMetrics } from "@/lib/vendor-metrics";
import { computeProductInsights } from "@/lib/product-insights";
import { getAnalyticsRange, parseRangeKey } from "@/lib/date-range";
import {
  generateOrderStatusData,
  generateOrderTrendsData,
  generateProductPerformanceData,
  generateRevenueChartData,
  generateVisitsChartData,
} from "@/lib/chart-utils";
import { getEffectiveVendorId, getStaffPermissions } from "@/lib/staff";

type CsvValue = string | number | null | undefined;

function escapeCsv(value: CsvValue): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvSection(title: string, headers: CsvValue[], rows: CsvValue[][]): string[] {
  return [
    [title],
    headers,
    ...rows,
  ].map((row) => row.map(escapeCsv).join(","));
}

function formatDate(date: Date | null): string {
  return date ? date.toISOString() : "All time";
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const vendorId = getEffectiveVendorId(session);

  if (!vendorId) {
    return NextResponse.json({ error: "Vendor account required." }, { status: 403 });
  }

  if (session?.user?.role === "staff") {
    const permissions = await getStaffPermissions(session.user.id);
    if (!permissions.analytics) {
      return NextResponse.json({ error: "Analytics access required." }, { status: 403 });
    }
  }

  if (!(await hasFeature(vendorId, "advanced_analytics"))) {
    return NextResponse.json({ error: "Advanced analytics aren't included on your plan." }, { status: 403 });
  }
  if (!(await hasFeature(vendorId, "exportable_reports"))) {
    return NextResponse.json({ error: "Report exports aren't included on your plan." }, { status: 403 });
  }

  const store = await getVendorStore(vendorId);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  try {
    const url = new URL(request.url);
    const rangeKey = parseRangeKey(url.searchParams.get("range"));
    const range = getAnalyticsRange(rangeKey, new Date(), {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    const [orders, visits, products, customerFirstOrderMap] = await Promise.all([
      getVendorOrders(vendorId, { from: range.from, to: range.to }),
      getVendorStoreVisits(vendorId, { from: range.from, to: range.to }),
      getVendorProducts(vendorId),
      getVendorCustomerFirstOrderMap(vendorId),
    ]);

    const previousOrders = range.previousFrom
      ? await getVendorOrders(vendorId, { from: range.previousFrom, to: range.previousTo })
      : [];
    const previousVisits = range.previousFrom
      ? await getVendorStoreVisits(vendorId, { from: range.previousFrom, to: range.previousTo })
      : [];

    const metrics = computeVendorPeriodMetrics(orders, range, customerFirstOrderMap);
    const previousMetrics = computeVendorPeriodMetrics(previousOrders, range, customerFirstOrderMap);
    const settledOrders = orders.filter(
      ({ order }) => order.status === "confirmed" || order.status === "delivered",
    );
    const previousSettledOrders = previousOrders.filter(
      ({ order }) => order.status === "confirmed" || order.status === "delivered",
    );
    const revenue = settledOrders.reduce(
      (sum, { order }) => sum + Number(order.total_amount ?? 0),
      0,
    );
    const previousRevenue = previousSettledOrders.reduce(
      (sum, { order }) => sum + Number(order.total_amount ?? 0),
      0,
    );
    const uniqueVisitors = new Set(visits.map((visit) => visit.visitor_id)).size;
    const previousUniqueVisitors = new Set(previousVisits.map((visit) => visit.visitor_id)).size;
    const conversionRate =
      uniqueVisitors > 0 ? (metrics.uniqueCustomers / uniqueVisitors) * 100 : null;

    const visitsBySource = visits.reduce<Record<string, number>>((counts, visit) => {
      const source = visit.source || "other";
      counts[source] = (counts[source] ?? 0) + 1;
      return counts;
    }, {});
    const topSources = Object.entries(visitsBySource).sort((a, b) => b[1] - a[1]);
    const productInsights = computeProductInsights(visits, orders, products);
    const revenueChart = generateRevenueChartData(orders, range);
    const orderStatus = generateOrderStatusData(orders);
    const orderTrends = generateOrderTrendsData(orders, range);
    const productPerformance = generateProductPerformanceData(orders);
    const visitsChart = generateVisitsChartData(visits, range);

    const lines = [
      ...csvSection("Report information", ["Metric", "Value"], [
        ["Store", store.name],
        ["Range", range.label],
        ["From", formatDate(range.from)],
        ["To", range.to.toISOString()],
      ]),
      [],
      ...csvSection("Analytics summary", ["Metric", "Selected period", "Previous period"], [
        ["Revenue (confirmed/delivered)", revenue, previousRevenue],
        ["Orders", orders.length, previousOrders.length],
        ["Confirmed/delivered orders", settledOrders.length, previousSettledOrders.length],
        ["Catalog size", products.length, null],
        ["Low-stock products (stock <= 2)", products.filter((product) => product.stock_count <= 2).length, null],
        ["Store visits", visits.length, previousVisits.length],
        ["Unique visitors", uniqueVisitors, previousUniqueVisitors],
        ["Visitor-to-buyer conversion (%)", conversionRate, null],
        ["Average order value", metrics.aov, previousMetrics.aov],
        ["Unique customers", metrics.uniqueCustomers, null],
        ["New customers", metrics.newCustomers, null],
        ["Repeat customers", metrics.repeatCustomers, null],
        ["Repeat customer rate (%)", metrics.repeatRate * 100, null],
        ["Average time to confirm (ms)", metrics.avgConfirmMs, null],
        ["Average time to deliver (ms)", metrics.avgDeliveryMs, null],
      ]),
      [],
      ...csvSection("Traffic sources", ["Source", "Visits", "Share (%)"], topSources.map(([source, count]) => [
        source,
        count,
        visits.length > 0 ? (count / visits.length) * 100 : 0,
      ])),
      [],
      ...csvSection("Product interest and conversion", [
        "Product",
        "Views",
        "Unique viewers",
        "Orders",
        "Units sold",
        "Conversion rate (%)",
        "Needs attention",
      ], productInsights.map((product) => [
        product.productName,
        product.views,
        product.uniqueViewers,
        product.ordersCount,
        product.unitsSold,
        product.uniqueViewers > 0 ? product.conversionRate * 100 : null,
        product.needsAttention ? "Yes" : "No",
      ])),
      [],
      ...csvSection("Revenue trend", ["Date", "Revenue", "Orders"], revenueChart.map((row) => [
        row.date,
        row.revenue,
        row.orders,
      ])),
      [],
      ...csvSection("Order status breakdown", ["Status", "Orders"], orderStatus.map((row) => [
        row.status,
        row.count,
      ])),
      [],
      ...csvSection("Order trends", ["Date", "Confirmed", "Pending", "Delivered"], orderTrends.map((row) => [
        row.date,
        row.confirmed,
        row.pending,
        row.delivered,
      ])),
      [],
      ...csvSection("Product performance", ["Product", "Units sold", "Revenue"], productPerformance.map((row) => [
        row.name,
        row.sold,
        row.revenue,
      ])),
      [],
      ...csvSection("Traffic trend", ["Date", "Visits", "Unique visitors"], visitsChart.map((row) => [
        row.date,
        row.visits,
        row.uniqueVisitors,
      ])),
      [],
      ...csvSection("Order details", [
        "Order ID",
        "Status",
        "Order total",
        "Created at",
        "Confirmed at",
        "Delivered at",
      ], orders.map(({ order }) => [
        order.id,
        order.status,
        order.total_amount,
        order.created_at,
        order.confirmed_at,
        order.delivered_at,
      ])),
    ];

    const csv = lines.join("\r\n");
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sellee-analytics-report.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logDevError("dashboard.analytics.export", error, { vendorId, storeId: store.id });
    return NextResponse.json({ error: "Could not generate analytics report." }, { status: 500 });
  }
}
