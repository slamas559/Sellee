import type { OrderRecord } from "@/types";
import type { RevenueChartData } from "@/components/dashboard/revenue-chart";
import type { OrderStatusData } from "@/components/dashboard/order-status-chart";
import type { TrendData } from "@/components/dashboard/order-trends-chart";
import type { ProductPerformanceData } from "@/components/dashboard/product-performance-chart";
import { bucketKey, enumerateBuckets, type AnalyticsRange } from "@/lib/date-range";

// Generate revenue chart data bucketed across the selected analytics range
export function generateRevenueChartData(
  orders: Array<{ order: OrderRecord; items: unknown[] }>,
  range: AnalyticsRange,
): RevenueChartData[] {
  const buckets: { [key: string]: { revenue: number; orders: number } } = {};
  const orderedKeys = enumerateBuckets(range, orders.map(({ order }) => order));

  for (const key of orderedKeys) {
    buckets[key] = { revenue: 0, orders: 0 };
  }

  for (const { order } of orders) {
    const key = bucketKey(new Date(order.created_at), range.granularity);

    if (buckets[key]) {
      buckets[key].orders += 1;
      if (order.status === "confirmed" || order.status === "delivered") {
        buckets[key].revenue += Number(order.total_amount ?? 0);
      }
    }
  }

  return orderedKeys.map((date) => ({
    date,
    revenue: buckets[date].revenue,
    orders: buckets[date].orders,
  }));
}

// Generate order status breakdown
export function generateOrderStatusData(orders: Array<{ order: OrderRecord; items: unknown[] }>): OrderStatusData[] {
  const statusMap: { [key: string]: number } = {
    confirmed: 0,
    pending: 0,
    delivered: 0,
    rejected: 0,
  };

  for (const { order } of orders) {
    const status = (order.status ?? "pending_whatsapp").replace("pending_whatsapp", "pending");
    if (status in statusMap) {
      statusMap[status] += 1;
    }
  }

  const colors: { [key: string]: string } = {
    confirmed: "#10b981",
    pending: "#f59e0b",
    delivered: "#06b6d4",
    rejected: "#ef4444",
  };

  return Object.entries(statusMap)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      fill: colors[status],
    }));
}

// Generate order trends bucketed across the selected analytics range
export function generateOrderTrendsData(
  orders: Array<{ order: OrderRecord; items: unknown[] }>,
  range: AnalyticsRange,
): TrendData[] {
  const buckets: { [key: string]: { confirmed: number; pending: number; delivered: number } } = {};
  const orderedKeys = enumerateBuckets(range, orders.map(({ order }) => order));

  for (const key of orderedKeys) {
    buckets[key] = { confirmed: 0, pending: 0, delivered: 0 };
  }

  for (const { order } of orders) {
    const key = bucketKey(new Date(order.created_at), range.granularity);

    if (buckets[key]) {
      const status = (order.status ?? "pending_whatsapp").replace("pending_whatsapp", "pending");
      if (status === "confirmed") {
        buckets[key].confirmed += 1;
      } else if (status === "pending") {
        buckets[key].pending += 1;
      } else if (status === "delivered") {
        buckets[key].delivered += 1;
      }
    }
  }

  return orderedKeys.map((date) => ({
    date,
    ...buckets[date],
  }));
}

// Generate product performance data
export function generateProductPerformanceData(
  orders: Array<{ order: OrderRecord; items: Array<{ product_name: string; quantity: number; unit_price: number }> }>
): ProductPerformanceData[] {
  const productMap: { [key: string]: { sold: number; revenue: number } } = {};

  for (const { order, items } of orders) {
    if (order.status === "confirmed" || order.status === "delivered") {
      for (const item of items) {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { sold: 0, revenue: 0 };
        }
        productMap[item.product_name].sold += item.quantity;
        productMap[item.product_name].revenue += item.quantity * item.unit_price;
      }
    }
  }

  return Object.entries(productMap)
    .map(([name, data]) => ({
      name: name.length > 20 ? name.substring(0, 17) + "..." : name,
      sold: data.sold,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

export type VisitsChartData = {
  date: string;
  visits: number;
  uniqueVisitors: number;
};

// Generate store-visits chart data bucketed across the selected analytics range
export function generateVisitsChartData(
  visits: Array<{ visitor_id: string; created_at: string }>,
  range: AnalyticsRange,
): VisitsChartData[] {
  const buckets: { [key: string]: { visits: number; visitors: Set<string> } } = {};
  const orderedKeys = enumerateBuckets(range, visits);

  for (const key of orderedKeys) {
    buckets[key] = { visits: 0, visitors: new Set() };
  }

  for (const visit of visits) {
    const key = bucketKey(new Date(visit.created_at), range.granularity);
    if (buckets[key]) {
      buckets[key].visits += 1;
      buckets[key].visitors.add(visit.visitor_id);
    }
  }

  return orderedKeys.map((date) => ({
    date,
    visits: buckets[date].visits,
    uniqueVisitors: buckets[date].visitors.size,
  }));
}