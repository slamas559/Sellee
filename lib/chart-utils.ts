import type { OrderRecord } from "@/types";
import type { RevenueChartData } from "@/components/dashboard/revenue-chart";
import type { OrderStatusData } from "@/components/dashboard/order-status-chart";
import type { TrendData } from "@/components/dashboard/order-trends-chart";
import type { ProductPerformanceData } from "@/components/dashboard/product-performance-chart";

// Generate revenue chart data for last 30 days
export function generateRevenueChartData(orders: Array<{ order: OrderRecord; items: unknown[] }>): RevenueChartData[] {
  const last30Days: { [key: string]: { revenue: number; orders: number } } = {};

  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    last30Days[dateStr] = { revenue: 0, orders: 0 };
  }

  // Aggregate data
  for (const { order } of orders) {
    const orderDate = new Date(order.created_at);
    const dateStr = orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (last30Days[dateStr]) {
      last30Days[dateStr].orders += 1;
      if (order.status === "confirmed" || order.status === "delivered") {
        last30Days[dateStr].revenue += Number(order.total_amount ?? 0);
      }
    }
  }

  return Object.entries(last30Days).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
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

// Generate order trends for last 30 days
export function generateOrderTrendsData(orders: Array<{ order: OrderRecord; items: unknown[] }>): TrendData[] {
  const last30Days: { [key: string]: { confirmed: number; pending: number; delivered: number } } = {};

  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    last30Days[dateStr] = { confirmed: 0, pending: 0, delivered: 0 };
  }

  // Aggregate data
  for (const { order } of orders) {
    const orderDate = new Date(order.created_at);
    const dateStr = orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (last30Days[dateStr]) {
      const status = (order.status ?? "pending_whatsapp").replace("pending_whatsapp", "pending");
      if (status === "confirmed") {
        last30Days[dateStr].confirmed += 1;
      } else if (status === "pending") {
        last30Days[dateStr].pending += 1;
      } else if (status === "delivered") {
        last30Days[dateStr].delivered += 1;
      }
    }
  }

  return Object.entries(last30Days).map(([date, data]) => ({
    date,
    ...data,
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
