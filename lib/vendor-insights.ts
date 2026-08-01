import { todayStartIso } from "@/lib/whatsapp-bot/parse";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

/**
 * Read-only vendor data queries, scoped to a single store_id, purpose-built
 * for the vendor dashboard AI assistant's tools. These never take a vendor
 * ID directly - always a store_id that the caller has ALREADY verified
 * belongs to the authenticated vendor's session, so there's no path for the
 * assistant to see another vendor's data.
 */

export type SalesPeriod = "today" | "7d" | "30d";

export type SalesSummary = {
  period: SalesPeriod;
  confirmed_revenue: number;
  confirmed_orders: number;
  pending_orders: number;
};

export type LowStockItem = {
  id: string;
  name: string;
  stock_count: number;
};

export type VendorProductSummary = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock_count: number;
  is_available: boolean;
};

export type VendorOrderSummary = {
  id: string;
  customer_name: string | null;
  status: string;
  total_amount: number;
  item_count: number;
  created_at: string;
};

function periodStartIso(period: SalesPeriod): string {
  if (period === "today") return todayStartIso();
  const days = period === "7d" ? 7 : 30;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}

export async function getVendorSalesSummary(storeId: string, period: SalesPeriod): Promise<SalesSummary> {
  const supabase = createAdminSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount, status")
    .eq("store_id", storeId)
    .gte("created_at", periodStartIso(period));

  if (error) {
    logDevError("vendor-insights.sales-summary", error, { storeId, period });
    throw new Error("Could not load sales summary.");
  }

  const rows = (orders ?? []) as Array<{ total_amount: number | null; status: string | null }>;
  const confirmedOrders = rows.filter((row) => row.status === "confirmed");
  const pendingOrders = rows.filter((row) => row.status === "pending_whatsapp");

  return {
    period,
    confirmed_revenue: confirmedOrders.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0),
    confirmed_orders: confirmedOrders.length,
    pending_orders: pendingOrders.length,
  };
}

export async function getVendorLowStock(storeId: string, threshold = 2): Promise<LowStockItem[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock_count")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .lte("stock_count", threshold)
    .order("stock_count", { ascending: true })
    .limit(15);

  if (error) {
    logDevError("vendor-insights.low-stock", error, { storeId });
    throw new Error("Could not load low stock items.");
  }

  return (data ?? []) as LowStockItem[];
}

export async function searchVendorProducts(
  storeId: string,
  params: { query?: string; category?: string; limit?: number },
): Promise<VendorProductSummary[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, price, stock_count, is_available")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    logDevError("vendor-insights.search-products", error, { storeId });
    throw new Error("Could not search products.");
  }

  const rows = (data ?? []) as VendorProductSummary[];
  const qLower = params.query?.trim().toLowerCase();
  const categoryLower = params.category?.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    if (categoryLower && (row.category ?? "").toLowerCase() !== categoryLower) return false;
    if (!qLower) return true;
    return `${row.name} ${row.category ?? ""}`.toLowerCase().includes(qLower);
  });

  return filtered.slice(0, params.limit ?? 15);
}

export async function getVendorRecentOrders(
  storeId: string,
  params: { status?: string; limit?: number },
): Promise<VendorOrderSummary[]> {
  const supabase = createAdminSupabaseClient();
  const limit = params.limit ?? 10;

  let query = supabase
    .from("orders")
    .select("id, customer_name, status, total_amount, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: orders, error } = await query;

  if (error) {
    logDevError("vendor-insights.recent-orders", error, { storeId });
    throw new Error("Could not load recent orders.");
  }

  const typedOrders = (orders ?? []) as Array<{
    id: string;
    customer_name: string | null;
    status: string;
    total_amount: number;
    created_at: string;
  }>;

  if (typedOrders.length === 0) return [];

  const orderIds = typedOrders.map((order) => order.id);
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id")
    .in("order_id", orderIds);

  if (itemsError) {
    logDevError("vendor-insights.recent-orders.items", itemsError, { storeId });
  }

  const itemCountByOrderId = new Map<string, number>();
  for (const row of (items ?? []) as Array<{ order_id: string }>) {
    itemCountByOrderId.set(row.order_id, (itemCountByOrderId.get(row.order_id) ?? 0) + 1);
  }

  return typedOrders.map((order) => ({
    id: order.id,
    customer_name: order.customer_name,
    status: order.status,
    total_amount: Number(order.total_amount ?? 0),
    item_count: itemCountByOrderId.get(order.id) ?? 0,
    created_at: order.created_at,
  }));
}