import { formatNaira, slugify } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
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

async function getCustomerOrders(customerPhone: string, limit = 20): Promise<OrderLite[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, store_id, customer_name, customer_whatsapp, status, total_amount, created_at")
    .eq("customer_whatsapp", customerPhone)
    .order("created_at", { ascending: false })
    .limit(limit);

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

async function handleMyOrders(from: string, normalizedFrom: string) {
  const orders = await getCustomerOrders(normalizedFrom, 10);
  if (orders.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "You have no orders yet. Place an order from Sellee marketplace and check again.",
    });
    return;
  }

  const storesMap = await getStoresMap(Array.from(new Set(orders.map((order) => order.store_id))));
  const lines = orders.map((order) => {
    const storeName = storesMap.get(order.store_id)?.name ?? "Store";
    return `#${shortRef(order.id)} | ${order.status} | ${formatNaira(Number(order.total_amount))} | ${storeName}`;
  });

  await sendWhatsAppTextMessage({
    to: from,
    message: `Your recent orders:\n${lines.join("\n")}`,
  });
}

async function handleMyStatus(from: string, normalizedFrom: string) {
  const orders = await getCustomerOrders(normalizedFrom, 20);
  if (orders.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "You have no active status yet. Place an order first, then check MY STATUS.",
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
    .map(([status, count]) => `${status}: ${count}`)
    .join(" | ");

  const latestLines = latest.map(
    (order) => `#${shortRef(order.id)} - ${order.status} - ${formatNaira(Number(order.total_amount))}`,
  );

  await sendWhatsAppTextMessage({
    to: from,
    message: `Order status snapshot:\nActive orders: ${active.length}\nRecent mix: ${statusSummary || "none"}\n\nLatest:\n${latestLines.join("\n")}`,
  });
}

async function handleTrack(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const ref = extractRef(body);
  if (!ref) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "Usage: TRACK <ORDER_REF>. Example: TRACK ABCD1234",
    });
    return null;
  }

  const order = await findCustomerOrderByReference(normalizedFrom, ref);
  if (!order) {
    await sendWhatsAppTextMessage({
      to: from,
      message: `Order ${ref} not found for this number.`,
    });
    return null;
  }

  const storesMap = await getStoresMap([order.store_id]);
  const storeName = storesMap.get(order.store_id)?.name ?? "Store";

  await sendWhatsAppTextMessage({
    to: from,
    message: `Order #${shortRef(order.id)}\nStore: ${storeName}\nStatus: ${order.status}\nTotal: ${formatNaira(Number(order.total_amount))}`,
  });
  return order.store_id;
}

async function handleCancel(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const ref = extractRef(body);
  if (!ref) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "Usage: CANCEL <ORDER_REF>. Example: CANCEL ABCD1234",
    });
    return null;
  }

  const order = await findCustomerOrderByReference(normalizedFrom, ref);
  if (!order) {
    await sendWhatsAppTextMessage({
      to: from,
      message: `Order ${ref} not found for this number.`,
    });
    return null;
  }

  if (order.status !== "pending_whatsapp") {
    await sendWhatsAppTextMessage({
      to: from,
      message: `Order #${shortRef(order.id)} cannot be cancelled because it is currently "${order.status}".`,
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
    message: `Order #${shortRef(order.id)} has been cancelled successfully.`,
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
      message: "Usage: FOLLOW <STORE_NAME_OR_SLUG>. Example: FOLLOW moores-furniture",
    });
    return null;
  }

  const resolved = await resolveStoreByInput(storeTarget);
  if (resolved.kind === "none") {
    await sendWhatsAppTextMessage({
      to: from,
      message:
        "Store not found. Use exact store slug from the store URL and try again.",
    });
    return null;
  }
  if (resolved.kind === "ambiguous") {
    await sendWhatsAppTextMessage({
      to: from,
      message: `Multiple stores matched. Use exact slug:\n${formatStoreCandidates(
        resolved.candidates,
      )}\nExample: FOLLOW store-slug`,
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
    message: `You are now following ${store.name}.`,
  });
  return store.id;
}

async function handleUnfollow(from: string, normalizedFrom: string, body: string): Promise<string | null> {
  const storeTarget = extractStoreTarget(body, "UNFOLLOW");
  if (!storeTarget) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "Usage: UNFOLLOW <STORE_NAME_OR_SLUG>. Example: UNFOLLOW moores-furniture",
    });
    return null;
  }

  const resolved = await resolveStoreByInput(storeTarget);
  if (resolved.kind === "none") {
    await sendWhatsAppTextMessage({
      to: from,
      message:
        "Store not found. Use exact store slug from the store URL and try again.",
    });
    return null;
  }
  if (resolved.kind === "ambiguous") {
    await sendWhatsAppTextMessage({
      to: from,
      message: `Multiple stores matched. Use exact slug:\n${formatStoreCandidates(
        resolved.candidates,
      )}\nExample: UNFOLLOW store-slug`,
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
    message: `You unfollowed ${store.name}.`,
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
      message: "You are not following any stores yet. Use FOLLOW <STORE_SLUG>.",
    });
    return;
  }

  const storesMap = await getStoresMap(storeIds);
  const lines = storeIds
    .map((id) => storesMap.get(id))
    .filter((store): store is StoreLite => Boolean(store))
    .map((store) => `- ${store.name} (${store.slug})`);

  await sendWhatsAppTextMessage({
    to: from,
    message: `Your followed stores:\n${lines.join("\n")}`,
  });
}

async function handleSearchProducts(from: string, query: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "Usage: SEARCH <product>. Example: SEARCH rice",
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
      message: `No products found for "${trimmedQuery}". Try another keyword.`,
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

  await sendWhatsAppTextMessage({
    to: from,
    message: `Search results for "${trimmedQuery}":\n${lines.join("\n\n")}`,
  });

  return products[0]?.store_id ?? null;
}

async function handleGreeting(from: string) {
  await sendWhatsAppTextMessage({
    to: from,
    message:
      "Hi, welcome to Sellee. I help with customer actions (MY ORDERS, MY STATUS, TRACK <ORDER_REF>, CANCEL <ORDER_REF>, SEARCH <product>, FOLLOW <store>) and vendor actions (LIST ORDERS, SALES TODAY, LOW STOCK, CONFIRM/REJECT, BROADCAST, BROADCAST STATUS). Send HELP to see commands.",
  });
}

export async function handleCustomerHelp(from: string) {
  await sendWhatsAppTextMessage({
    to: from,
    message:
      "Customer commands: MY ORDERS, MY STATUS, TRACK <ORDER_REF>, CANCEL <ORDER_REF>, SEARCH <product>, FOLLOW <STORE>, UNFOLLOW <STORE>, MY FOLLOWS.",
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

    default:
      return { handled: false };
  }
}

