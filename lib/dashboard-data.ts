import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { OrderRecord, ProductRecord, StoreRecord } from "@/types";

export async function getVendorStore(vendorId: string): Promise<StoreRecord | null> {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const store = (data as StoreRecord | null) ?? null;
  if (!store) {
    return null;
  }

  const { data: storeNichesData } = await supabase
    .from("store_niches")
    .select("niche_id, niche:niche_id(name)")
    .eq("store_id", store.id);

  const nicheRows =
    (storeNichesData as Array<{ niche_id: string; niche?: { name?: string } | null }> | null) ??
    [];

  return {
    ...store,
    niche_ids: nicheRows.map((row) => row.niche_id),
    niche_names: nicheRows.map((row) => row.niche?.name ?? "").filter(Boolean),
  };
}

export async function getVendorProducts(vendorId: string): Promise<ProductRecord[]> {
  const store = await getVendorStore(vendorId);

  if (!store) {
    return [];
  }

  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return ((data as ProductRecord[]) ?? []);
}

export type VendorOrderView = {
  order: OrderRecord;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

export type VendorWhatsAppLinkStatus = {
  linked: {
    whatsapp_number: string;
    linked_at: string;
    is_active: boolean;
  } | null;
  pending_code: {
    code: string;
    expires_at: string;
  } | null;
};

export type CustomerOrderView = {
  order: OrderRecord;
  store: {
    id: string;
    name: string;
    slug: string;
  } | null;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

export type VendorCustomerBotActivity = {
  total_last_7d: number;
  by_command: Array<{ command: string; count: number }>;
  recent: Array<{
    id: string;
    sender_phone: string | null;
    command: string | null;
    created_at: string;
    status: string | null;
  }>;
};

export type VendorOutboundBotTrends = {
  total_last_7d: number;
  success_count: number;
  failed_count: number;
  by_command: Array<{ command: string; count: number }>;
  daily: Array<{
    date: string;
    success: number;
    failed: number;
  }>;
};

export async function getVendorOrders(vendorId: string): Promise<VendorOrderView[]> {
  const store = await getVendorStore(vendorId);

  if (!store) {
    return [];
  }

  const supabase = createAdminSupabaseClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, store_id, customer_name, customer_whatsapp, status, total_amount, payment_method, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  const typedOrders = ((orders as OrderRecord[]) ?? []);

  if (typedOrders.length === 0) {
    return [];
  }

  const orderIds = typedOrders.map((order) => order.id);

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("order_id, quantity, unit_price, product:product_id(name)")
    .in("order_id", orderIds);

  const itemsByOrderId = new Map<string, VendorOrderView["items"]>();

  for (const row of orderItems ?? []) {
    const orderId = String((row as { order_id: string }).order_id);
    const current = itemsByOrderId.get(orderId) ?? [];
    const productName =
      ((row as { product?: { name?: string } | Array<{ name?: string }> }).product &&
      Array.isArray((row as { product?: unknown }).product)
        ? (row as { product: Array<{ name?: string }> }).product[0]?.name
        : (row as { product?: { name?: string } }).product?.name) ?? "Unknown product";

    current.push({
      product_name: productName,
      quantity: Number((row as { quantity: number }).quantity),
      unit_price: Number((row as { unit_price: number }).unit_price),
    });

    itemsByOrderId.set(orderId, current);
  }

  return typedOrders.map((order) => ({
    order,
    items: itemsByOrderId.get(order.id) ?? [],
  }));
}

export async function getVendorWhatsAppLinkStatus(
  vendorId: string,
): Promise<VendorWhatsAppLinkStatus> {
  const supabase = createAdminSupabaseClient();

  const { data: linked } = await supabase
    .from("whatsapp_vendor_links")
    .select("whatsapp_number, linked_at, is_active")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  const { data: pendingCode } = await supabase
    .from("whatsapp_link_codes")
    .select("code, expires_at")
    .eq("vendor_id", vendorId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    linked: linked
      ? {
          whatsapp_number: String(linked.whatsapp_number),
          linked_at: String(linked.linked_at),
          is_active: Boolean(linked.is_active),
        }
      : null,
    pending_code: pendingCode
      ? {
          code: String(pendingCode.code),
          expires_at: String(pendingCode.expires_at),
        }
      : null,
  };
}

export async function getCustomerOrders(userId: string): Promise<CustomerOrderView[]> {
  const supabase = createAdminSupabaseClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, phone")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    return [];
  }

  const byUserQuery = supabase
    .from("orders")
    .select("id, store_id, customer_name, customer_whatsapp, status, total_amount, payment_method, created_at")
    .eq("customer_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  const byPhoneQuery = user.phone
    ? supabase
        .from("orders")
        .select("id, store_id, customer_name, customer_whatsapp, status, total_amount, payment_method, created_at")
        .is("customer_user_id", null)
        .eq("customer_whatsapp", String(user.phone))
        .order("created_at", { ascending: false })
        .limit(80)
    : Promise.resolve({ data: [] as OrderRecord[] });

  const [{ data: byUserOrders }, { data: byPhoneOrders }] = await Promise.all([
    byUserQuery,
    byPhoneQuery,
  ]);

  const ordersMap = new Map<string, OrderRecord>();

  for (const row of ((byUserOrders as OrderRecord[] | null) ?? [])) {
    ordersMap.set(row.id, row);
  }

  for (const row of ((byPhoneOrders as OrderRecord[] | null) ?? [])) {
    if (!ordersMap.has(row.id)) {
      ordersMap.set(row.id, row);
    }
  }

  const orders = [...ordersMap.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const storeIds = [...new Set(orders.map((order) => order.store_id))];

  const [{ data: storesData }, { data: orderItemsData }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug")
      .in("id", storeIds),
    supabase
      .from("order_items")
      .select("order_id, quantity, unit_price, product:product_id(name)")
      .in("order_id", orderIds),
  ]);

  const storesById = new Map(
    ((storesData ?? []) as Array<{ id: string; name: string; slug: string }>).map((store) => [
      store.id,
      store,
    ]),
  );

  const itemsByOrderId = new Map<string, CustomerOrderView["items"]>();

  for (const row of orderItemsData ?? []) {
    const orderId = String((row as { order_id: string }).order_id);
    const current = itemsByOrderId.get(orderId) ?? [];

    const productName =
      ((row as { product?: { name?: string } | Array<{ name?: string }> }).product &&
      Array.isArray((row as { product?: unknown }).product)
        ? (row as { product: Array<{ name?: string }> }).product[0]?.name
        : (row as { product?: { name?: string } }).product?.name) ?? "Unknown product";

    current.push({
      product_name: productName,
      quantity: Number((row as { quantity: number }).quantity),
      unit_price: Number((row as { unit_price: number }).unit_price),
    });

    itemsByOrderId.set(orderId, current);
  }

  return orders.map((order) => ({
    order,
    store: storesById.get(order.store_id) ?? null,
    items: itemsByOrderId.get(order.id) ?? [],
  }));
}

export async function getVendorCustomerBotActivity(
  vendorId: string,
): Promise<VendorCustomerBotActivity> {
  const store = await getVendorStore(vendorId);
  if (!store) {
    return {
      total_last_7d: 0,
      by_command: [],
      recent: [],
    };
  }

  const supabase = createAdminSupabaseClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("whatsapp_message_logs")
    .select("id, sender_phone, command, created_at, status, provider_payload")
    .eq("direction", "inbound")
    .eq("role", "customer")
    .gte("created_at", sevenDaysAgo)
    .filter("provider_payload->>scope_store_id", "eq", store.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      total_last_7d: 0,
      by_command: [],
      recent: [],
    };
  }

  const rows =
    (data as Array<{
      id: string;
      sender_phone?: string | null;
      command?: string | null;
      created_at: string;
      status?: string | null;
    }> | null) ?? [];

  const counter = new Map<string, number>();
  for (const row of rows) {
    const command = (row.command ?? "UNKNOWN").trim() || "UNKNOWN";
    counter.set(command, (counter.get(command) ?? 0) + 1);
  }

  const byCommand = [...counter.entries()]
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total_last_7d: rows.length,
    by_command: byCommand,
    recent: rows.slice(0, 10).map((row) => ({
      id: row.id,
      sender_phone: row.sender_phone ?? null,
      command: row.command ?? null,
      created_at: row.created_at,
      status: row.status ?? null,
    })),
  };
}

function toIsoDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export async function getVendorOutboundBotTrends(
  vendorId: string,
): Promise<VendorOutboundBotTrends> {
  const store = await getVendorStore(vendorId);
  if (!store) {
    return {
      total_last_7d: 0,
      success_count: 0,
      failed_count: 0,
      by_command: [],
      daily: [],
    };
  }

  const supabase = createAdminSupabaseClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("whatsapp_message_logs")
    .select("id, command, created_at, status")
    .eq("direction", "outbound")
    .gte("created_at", sevenDaysAgo)
    .filter("provider_payload->>scope_store_id", "eq", store.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return {
      total_last_7d: 0,
      success_count: 0,
      failed_count: 0,
      by_command: [],
      daily: [],
    };
  }

  const rows =
    (data as Array<{
      id: string;
      command?: string | null;
      created_at: string;
      status?: string | null;
    }> | null) ?? [];

  const commandCounter = new Map<string, number>();
  const dailyCounter = new Map<string, { success: number; failed: number }>();
  let successCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    const command = (row.command ?? "OUTBOUND").trim() || "OUTBOUND";
    commandCounter.set(command, (commandCounter.get(command) ?? 0) + 1);

    const dateKey = toIsoDate(row.created_at);
    const bucket = dailyCounter.get(dateKey) ?? { success: 0, failed: 0 };
    if (row.status === "ok") {
      bucket.success += 1;
      successCount += 1;
    } else {
      bucket.failed += 1;
      failedCount += 1;
    }
    dailyCounter.set(dateKey, bucket);
  }

  const byCommand = [...commandCounter.entries()]
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);

  const daily = [...dailyCounter.entries()]
    .map(([date, values]) => ({
      date,
      success: values.success,
      failed: values.failed,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_last_7d: rows.length,
    success_count: successCount,
    failed_count: failedCount,
    by_command: byCommand,
    daily,
  };
}
