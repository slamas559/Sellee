import { formatNaira, slugify } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { formatBotStatus, waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { sendPaginatedList } from "@/lib/whatsapp-bot/pagination";
import {
  type BotCommand,
  extractRef,
  extractSearchQuery,
  normalizeIntentText,
} from "@/lib/whatsapp-bot/parse";

type StoreLite = {
  id: string;
  name: string;
  slug: string;
  whatsapp_number?: string | null;
  is_active?: boolean;
};

type OrderLite = {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_whatsapp: string;
  status: string;
  total_amount: number;
  created_at: string;
};

type ProductSearchRow = {
  id: string;
  store_id: string;
  name: string;
  price: number;
  category?: string | null;
  stock_count?: number | null;
  is_available?: boolean | null;
};

type CustomerCommandResult = {
  handled: boolean;
  scopeStoreId?: string | null;
};

function shortRef(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

async function ensureCustomerLink(customerPhone: string) {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("whatsapp_customer_links").upsert(
    {
      customer_phone: customerPhone,
      linked_at: nowIso,
      is_active: true,
    },
    { onConflict: "customer_phone" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function getCustomerOrders(
  customerPhone: string,
  limit = 20,
  statusFilter?: string | null,
): Promise<OrderLite[]> {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("orders")
    .select("id, store_id, customer_name, customer_whatsapp, status, total_amount, created_at")
    .eq("customer_whatsapp", customerPhone)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  query = query.limit(limit);
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as OrderLite[]);
}

async function getStoresMap(storeIds: string[]): Promise<Map<string, StoreLite>> {
  const supabase = createAdminSupabaseClient();
  if (storeIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, whatsapp_number, is_active")
    .in("id", storeIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as StoreLite[]).map((store) => [store.id, store]),
  );
}

async function findCustomerOrderByReference(customerPhone: string, rawRef: string) {
  const supabase = createAdminSupabaseClient();
  const ref = rawRef.toLowerCase();
  const isFullUuid = ref.includes("-") && ref.length >= 30;

  if (isFullUuid) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, store_id, customer_name, customer_whatsapp, status, total_amount, created_at")
      .eq("id", ref)
      .eq("customer_whatsapp", customerPhone)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as OrderLite | null;
  }

  const recentOrders = await getCustomerOrders(customerPhone, 80);
  return recentOrders.find((order) => order.id.toLowerCase().startsWith(ref)) ?? null;
}

type StoreResolution =
  | { kind: "match"; store: StoreLite }
  | { kind: "none" }
  | { kind: "ambiguous"; candidates: StoreLite[] };

async function resolveStoreByInput(rawInput: string): Promise<StoreResolution> {
  const supabase = createAdminSupabaseClient();
  const trimmed = rawInput.trim();
  if (!trimmed) return { kind: "none" };

  const slug = slugify(trimmed);
  if (slug) {
    const { data: bySlug, error: bySlugError } = await supabase
      .from("stores")
      .select("id, name, slug, whatsapp_number, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (bySlugError) {
      throw new Error(bySlugError.message);
    }

    if (bySlug) return { kind: "match", store: bySlug as StoreLite };
  }

  const { data: byName, error: byNameError } = await supabase
    .from("stores")
    .select("id, name, slug, whatsapp_number, is_active")
    .ilike("name", `%${trimmed}%`)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (byNameError) {
    throw new Error(byNameError.message);
  }

  const matches = (byName ?? []) as StoreLite[];
  if (matches.length === 0) return { kind: "none" };
  if (matches.length === 1) return { kind: "match", store: matches[0] };
  return { kind: "ambiguous", candidates: matches };
}

function formatStoreCandidates(candidates: StoreLite[]) {
  return candidates
    .slice(0, 5)
    .map((store) => `- ${store.name} (${store.slug})`)
    .join("\n");
}

function extractStoreTarget(body: string, command: "FOLLOW" | "UNFOLLOW"): string {
  const normalized = normalizeIntentText(body);
  const prefixes = command === "FOLLOW"
    ? ["FOLLOW ", "SUBSCRIBE TO ", "SUBSCRIBE "]
    : ["UNFOLLOW ", "UNSUBSCRIBE FROM ", "UNSUBSCRIBE ", "STOP FOLLOWING "];

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return body.trim().slice(prefix.length).trim();
    }
  }

  return body.trim().slice(command.length).trim();
}

function getPublicBaseUrl(): string {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function extractOrderStatusFilter(body: string): string | null {
  const normalized = normalizeIntentText(body);
  if (normalized.includes("CONFIRMED")) return "confirmed";
  if (normalized.includes("REJECTED")) return "rejected";
  if (normalized.includes("PENDING")) return "pending_whatsapp";
  if (normalized.includes("CANCELLED") || normalized.includes("CANCELED")) return "cancelled";
  return null;
}

function orderFilterLabel(statusFilter: string | null): string {
  if (statusFilter === "confirmed") return "Confirmed Orders";
  if (statusFilter === "rejected") return "Rejected Orders";
  if (statusFilter === "pending_whatsapp") return "Pending Orders";
  if (statusFilter === "cancelled") return "Cancelled Orders";
  return "Your Recent Orders";
}

async function handleMyOrders(from: string, normalizedFrom: string, statusFilter: string | null = null) {
  const orders = await getCustomerOrders(normalizedFrom, 20, statusFilter);
  if (orders.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle(statusFilter ? "No Matching Orders" : "No Orders Yet"),
        statusFilter
          ? `You have no ${orderFilterLabel(statusFilter).toLowerCase()}.`
          : "You have no orders yet.",
        statusFilter
          ? "Try: MY ORDERS for all orders."
          : "Place an order from the marketplace, then send MY ORDERS again.",
      ),
    });
    return;
  }

  const storesMap = await getStoresMap(Array.from(new Set(orders.map((order) => order.store_id))));
  const lines = orders.map((order) => {
    const storeName = storesMap.get(order.store_id)?.name ?? "Store";
    return `#${shortRef(order.id)} | ${formatBotStatus(order.status)} | ${formatNaira(Number(order.total_amount))} | ${storeName}`;
  });

  await sendPaginatedList({
    to: from,
    role: "customer",
    title: orderFilterLabel(statusFilter),
    lines,
    pageSize: 5,
    paginateWhenAtLeast: 9,
    emptyMessage: waMessage(waTitle("No Orders"), "No recent orders found."),
    hint: statusFilter
      ? "Tip: Send MY ORDERS for all orders."
      : "Tip: Send TRACK <ORDER_REF> for full details.",
  });
}

async function handleMyStatus(from: string, normalizedFrom: string) {
  const orders = await getCustomerOrders(normalizedFrom, 20);
  if (orders.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("No Order Status Yet"),
        "Place an order first, then send MY STATUS.",
      ),
    });
    return;
  }

  const activeStatuses = new Set(["pending_whatsapp", "confirmed", "processing", "shipped"]);
  const active = orders.filter((order) => activeStatuses.has(String(order.status)));
  const latest = orders.slice(0, 5);

  const statusCounter = new Map<string, number>();
  for (const order of latest) {
    const status = String(order.status ?? "unknown");
    statusCounter.set(status, (statusCounter.get(status) ?? 0) + 1);
  }

  const statusSummary = [...statusCounter.entries()]
    .map(([status, count]) => `${formatBotStatus(status)}: ${count}`)
    .join(" | ");

  const latestLines = latest.map(
    (order) => `#${shortRef(order.id)} - ${formatBotStatus(order.status)} - ${formatNaira(Number(order.total_amount))}`,
  );

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Order Status Snapshot"),
      `Active orders: ${active.length}`,
      `Recent mix: ${statusSummary || "None"}`,
      waTitle("Latest"),
      waList(latestLines),
    ),
  });
}

async function handleTrack(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const ref = extractRef(body);
  if (!ref) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "TRACK <ORDER_REF>",
        "Example: TRACK ABCD1234",
      ),
    });
    return null;
  }

  const order = await findCustomerOrderByReference(normalizedFrom, ref);
  if (!order) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Order Not Found"),
        `No order matched: ${ref}`,
        "Send MY ORDERS to see your recent order references.",
      ),
    });
    return null;
  }

  const storesMap = await getStoresMap([order.store_id]);
  const storeName = storesMap.get(order.store_id)?.name ?? "Store";

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle(`Order #${shortRef(order.id)}`),
      `Store: ${storeName}`,
      `Status: ${formatBotStatus(order.status)}`,
      `Total: ${formatNaira(Number(order.total_amount))}`,
    ),
  });
  return order.store_id;
}

async function handleCancel(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const ref = extractRef(body);
  if (!ref) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "CANCEL <ORDER_REF>",
        "Example: CANCEL ABCD1234",
      ),
    });
    return null;
  }

  const order = await findCustomerOrderByReference(normalizedFrom, ref);
  if (!order) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Order Not Found"),
        `No order matched: ${ref}`,
        "Send MY ORDERS to see your recent order references.",
      ),
    });
    return null;
  }

  if (order.status !== "pending_whatsapp") {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Cannot Cancel Order"),
        `Order #${shortRef(order.id)} is currently: ${formatBotStatus(order.status)}.`,
        "Only pending orders can be cancelled.",
      ),
    });
    return order.store_id;
  }

  const supabase = createAdminSupabaseClient();
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", order.id)
    .eq("customer_whatsapp", normalizedFrom);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const storesMap = await getStoresMap([order.store_id]);
  const store = storesMap.get(order.store_id);

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Order Cancelled"),
      `Order #${shortRef(order.id)} was cancelled successfully.`,
    ),
  });

  if (store?.whatsapp_number) {
    await sendWhatsAppTextMessage({
      to: store.whatsapp_number,
      message: `Customer cancelled order #${shortRef(order.id)}.`,
    });
  }
  return order.store_id;
}

async function handleFollow(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const storeTarget = extractStoreTarget(body, "FOLLOW");
  if (!storeTarget) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "FOLLOW <STORE_NAME_OR_SLUG>",
        "Example: FOLLOW moores-furniture",
      ),
    });
    return null;
  }

  const resolved = await resolveStoreByInput(storeTarget);
  if (resolved.kind === "none") {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Store Not Found"),
        "Use the exact store slug from the store URL and try again.",
      ),
    });
    return null;
  }
  if (resolved.kind === "ambiguous") {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Multiple Stores Found"),
        "Use an exact slug:",
        formatStoreCandidates(resolved.candidates),
        "Example: FOLLOW store-slug",
      ),
    });
    return null;
  }
  const store = resolved.store;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("customer_store_follows").upsert(
    {
      customer_phone: normalizedFrom,
      store_id: store.id,
    },
    {
      onConflict: "customer_phone,store_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Followed Successfully"),
      `You are now following ${store.name}.`,
    ),
  });
  return store.id;
}

async function handleUnfollow(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const storeTarget = extractStoreTarget(body, "UNFOLLOW");
  if (!storeTarget) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "UNFOLLOW <STORE_NAME_OR_SLUG>",
        "Example: UNFOLLOW moores-furniture",
      ),
    });
    return null;
  }

  const resolved = await resolveStoreByInput(storeTarget);
  if (resolved.kind === "none") {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Store Not Found"),
        "Use the exact store slug from the store URL and try again.",
      ),
    });
    return null;
  }
  if (resolved.kind === "ambiguous") {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Multiple Stores Found"),
        "Use an exact slug:",
        formatStoreCandidates(resolved.candidates),
        "Example: UNFOLLOW store-slug",
      ),
    });
    return null;
  }
  const store = resolved.store;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("customer_store_follows")
    .delete()
    .eq("customer_phone", normalizedFrom)
    .eq("store_id", store.id);

  if (error) {
    throw new Error(error.message);
  }

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Unfollowed"),
      `You no longer follow ${store.name}.`,
    ),
  });
  return store.id;
}

async function handleMyFollows(from: string, normalizedFrom: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("customer_store_follows")
    .select("store_id")
    .eq("customer_phone", normalizedFrom)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    throw new Error(error.message);
  }

  const storeIds = ((data ?? []) as Array<{ store_id: string }>).map((row) => row.store_id);
  if (storeIds.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("No Followed Stores"),
        "You are not following any stores yet.",
        "Use: FOLLOW <STORE_SLUG>",
      ),
    });
    return;
  }

  const storesMap = await getStoresMap(storeIds);
  const lines = storeIds
    .map((id) => storesMap.get(id))
    .filter((store): store is StoreLite => Boolean(store))
    .map((store) => `- ${store.name} (${store.slug})`);

  await sendPaginatedList({
    to: from,
    role: "customer",
    title: "Your Followed Stores",
    lines,
    pageSize: 5,
    paginateWhenAtLeast: 9,
    emptyMessage: waMessage(waTitle("No Followed Stores"), "You are not following any stores yet."),
  });
}

async function handleSearchProducts(from: string, query: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "SEARCH <product>",
        "Example: SEARCH rice",
      ),
    });
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, store_id, name, price, category, stock_count, is_available")
    .or(`name.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%,category.ilike.%${trimmedQuery}%`)
    .eq("is_available", true)
    .gt("stock_count", 0)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as ProductSearchRow[];
  if (products.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("No Products Found"),
        `No results for "${trimmedQuery}".`,
        "Try another keyword.",
      ),
    });
    return null;
  }

  const storeIds = Array.from(new Set(products.map((product) => product.store_id)));
  const storesMap = await getStoresMap(storeIds);
  const baseUrl = getPublicBaseUrl();

  const lines = products.map((product, index) => {
    const store = storesMap.get(product.store_id);
    const storeName = store?.name ?? "Store";
    const productUrl = store?.slug
      ? `${baseUrl}/store/${store.slug}/${product.id}`
      : `${baseUrl}/marketplace`;
    return `${index + 1}. ${product.name} - ${formatNaira(Number(product.price))} - ${storeName}\n${productUrl}`;
  });

  await sendPaginatedList({
    to: from,
    role: "customer",
    title: `Search Results: "${trimmedQuery}"`,
    lines,
    pageSize: 5,
    paginateWhenAtLeast: 9,
    emptyMessage: waMessage(waTitle("No Products Found"), `No results for "${trimmedQuery}".`),
    hint: "Tip: Open any listed link to view full product details.",
  });

  return products[0]?.store_id ?? null;
}

async function handleGreeting(from: string) {
  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Hi there!"),
      "I am your Sellee WhatsApp assistant.",
      "I help customers track and manage orders, discover products and stores, and follow stores for updates.",
      waTitle("Customer Commands"),
      waList([
        "MY ORDERS",
        "MY CONFIRMED ORDERS",
        "MY REJECTED ORDERS",
        "MY PENDING ORDERS",
        "MY STATUS",
        "TRACK <ORDER_REF>",
        "CANCEL <ORDER_REF>",
        "SEARCH <product>",
        "FOLLOW <store>",
        "UNFOLLOW <store>",
        "MY FOLLOWS",
      ]),
      waTitle("Vendor Commands"),
      waList([
        "LIST ORDERS",
        "SALES TODAY",
        "LOW STOCK",
        "CONFIRM <ORDER_REF>",
        "REJECT <ORDER_REF>",
        "BROADCAST <message>",
        "BROADCAST STATUS",
      ]),
      "Send HELP to view this menu anytime.",
    ),
  });
}

export async function handleCustomerHelp(from: string) {
  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Customer Commands"),
      waList([
        "MY ORDERS - shows your recent orders",
        "MY CONFIRMED ORDERS - only confirmed orders",
        "MY REJECTED ORDERS - only rejected orders",
        "MY PENDING ORDERS - only pending orders",
        "MY STATUS - quick status summary",
        "TRACK <ORDER_REF> - view one order details",
        "CANCEL <ORDER_REF> - cancel pending order",
        "SEARCH <product> - find products across stores",
        "FOLLOW <STORE> - get updates from a store",
        "UNFOLLOW <STORE> - stop store updates",
        "MY FOLLOWS - list followed stores",
        "MORE - next page when a result list is very long",
      ]),
    ),
  });
}

export async function handleCustomerCommand(
  from: string,
  body: string,
  command: BotCommand,
): Promise<CustomerCommandResult> {
  const normalizedFrom = normalizeWhatsAppNumber(from);

  switch (command) {
    case "GREETING":
      await ensureCustomerLink(normalizedFrom);
      await handleGreeting(from);
      return { handled: true };

    case "HELP":
      await ensureCustomerLink(normalizedFrom);
      await handleCustomerHelp(from);
      return { handled: true };

    case "MY ORDERS":
      await ensureCustomerLink(normalizedFrom);
      await handleMyOrders(from, normalizedFrom);
      return { handled: true };

    case "MY ORDERS FILTER":
      await ensureCustomerLink(normalizedFrom);
      await handleMyOrders(from, normalizedFrom, extractOrderStatusFilter(body));
      return { handled: true };

    case "MY STATUS":
      await ensureCustomerLink(normalizedFrom);
      await handleMyStatus(from, normalizedFrom);
      return { handled: true };

    case "TRACK": {
      await ensureCustomerLink(normalizedFrom);
      const scopeStoreId = await handleTrack(from, normalizedFrom, body);
      return { handled: true, scopeStoreId };
    }

    case "CANCEL": {
      await ensureCustomerLink(normalizedFrom);
      const scopeStoreId = await handleCancel(from, normalizedFrom, body);
      return { handled: true, scopeStoreId };
    }

    case "SEARCH": {
      await ensureCustomerLink(normalizedFrom);
      const query = extractSearchQuery(body) ?? "";
      const scopeStoreId = await handleSearchProducts(from, query);
      return { handled: true, scopeStoreId };
    }

    case "FOLLOW": {
      await ensureCustomerLink(normalizedFrom);
      const scopeStoreId = await handleFollow(from, normalizedFrom, body);
      return { handled: true, scopeStoreId };
    }

    case "UNFOLLOW": {
      await ensureCustomerLink(normalizedFrom);
      const scopeStoreId = await handleUnfollow(from, normalizedFrom, body);
      return { handled: true, scopeStoreId };
    }

    case "MY FOLLOWS":
      await ensureCustomerLink(normalizedFrom);
      await handleMyFollows(from, normalizedFrom);
      return { handled: true };

    case "MORE":
      return { handled: false };

    default:
      return { handled: false };
  }
}

