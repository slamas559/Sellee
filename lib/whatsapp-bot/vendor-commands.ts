import { formatNaira } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { executeBroadcastNow, scheduleBroadcast } from "@/lib/whatsapp-bot/broadcasts";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { formatBotStatus, waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { sendPaginatedList } from "@/lib/whatsapp-bot/pagination";
import { extractRef, parseFlexibleScheduleDate, todayStartIso } from "@/lib/whatsapp-bot/parse";
import { findOrderByReference } from "@/lib/whatsapp-bot/repository";
import type { StoreForCommand } from "@/lib/whatsapp-bot/types";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function inTenMinutesIso(): string {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

function extractBroadcastMessage(commandText: string): string {
  return commandText.trim().slice("BROADCAST".length).trim();
}

function parseScheduleBroadcastInput(commandText: string): {
  scheduledAt: string;
  message: string;
} | null {
  const raw = commandText.trim().slice("SCHEDULE BROADCAST".length).trim();
  if (!raw) {
    return null;
  }

  const separatorIndex = raw.indexOf("|");
  if (separatorIndex < 0) {
    return null;
  }

  const datePart = raw.slice(0, separatorIndex).trim();
  const messagePart = raw.slice(separatorIndex + 1).trim();
  if (!datePart || !messagePart) {
    return null;
  }

  const scheduledDate = parseFlexibleScheduleDate(datePart);
  if (!scheduledDate) {
    return null;
  }

  if (scheduledDate.getTime() <= Date.now() + 60_000) {
    return null;
  }

  return {
    scheduledAt: scheduledDate.toISOString(),
    message: messagePart,
  };
}

export async function handleLinkCommand(from: string, body: string) {
  const code = extractRef(body);

  if (!code) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "LINK <CODE>",
        "Generate the code from your Sellee dashboard first.",
      ),
    });
    return;
  }

  const supabase = createAdminSupabaseClient();
  const normalizedFrom = normalizeWhatsAppNumber(from);

  const { data: linkCode, error: linkCodeError } = await supabase
    .from("whatsapp_link_codes")
    .select("vendor_id, code, expires_at, used_at")
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (linkCodeError) {
    throw new Error(linkCodeError.message);
  }

  if (!linkCode?.vendor_id) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Invalid Link Code"),
        "This code is invalid or expired.",
        "Generate a new code from dashboard integrations and try again.",
      ),
    });
    return;
  }

  const vendorId = String(linkCode.vendor_id);

  const { data: existingByNumber, error: existingByNumberError } = await supabase
    .from("whatsapp_vendor_links")
    .select("vendor_id")
    .eq("whatsapp_number", normalizedFrom)
    .maybeSingle();

  if (existingByNumberError) {
    throw new Error(existingByNumberError.message);
  }

  if (existingByNumber?.vendor_id && String(existingByNumber.vendor_id) !== vendorId) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Linking Blocked"),
        "This number is already linked to another vendor account.",
        "Contact support if this looks incorrect.",
      ),
    });
    return;
  }

  const nowIso = new Date().toISOString();

  const { error: upsertLinkError } = await supabase.from("whatsapp_vendor_links").upsert(
    {
      vendor_id: vendorId,
      whatsapp_number: normalizedFrom,
      linked_at: nowIso,
      last_verified_at: nowIso,
      is_active: true,
    },
    {
      onConflict: "vendor_id",
    },
  );

  if (upsertLinkError) {
    throw new Error(upsertLinkError.message);
  }

  const { error: markUsedError } = await supabase
    .from("whatsapp_link_codes")
    .update({ used_at: nowIso, used_whatsapp_number: normalizedFrom })
    .eq("vendor_id", vendorId)
    .eq("code", code)
    .is("used_at", null);

  if (markUsedError) {
    throw new Error(markUsedError.message);
  }

  await supabase.from("users").update({ phone: normalizedFrom }).eq("id", vendorId);
  await supabase
    .from("stores")
    .update({ whatsapp_number: normalizedFrom, is_active: true })
    .eq("vendor_id", vendorId);

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("WhatsApp Linked Successfully"),
      waTitle("Available Commands"),
      waList([
        "LIST ORDERS - shows recent store orders",
        "SALES TODAY - confirmed revenue + confirmed order count today",
        "LOW STOCK - products that need restock",
        "CONFIRM <ORDER_REF> - mark order as confirmed",
        "REJECT <ORDER_REF> - mark order as rejected",
        "BROADCAST <message> - send promo to followers",
        "BROADCAST STATUS - recent campaign results",
        "SCHEDULE BROADCAST <date time> | <message> - send later",
        "MORE - next page for long lists",
      ]),
    ),
  });
}

export async function generateLinkCodeForVendor(vendorId: string) {
  const supabase = createAdminSupabaseClient();
  const code = generateCode();
  const expiresAt = inTenMinutesIso();

  const { error: upsertError } = await supabase.from("whatsapp_link_codes").upsert(
    {
      vendor_id: vendorId,
      code,
      expires_at: expiresAt,
      used_at: null,
    },
    {
      onConflict: "vendor_id",
    },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return { code, expires_at: expiresAt };
}

export async function handleConfirmReject(
  command: "CONFIRM" | "REJECT",
  body: string,
  from: string,
  store: StoreForCommand,
) {
  const ref = extractRef(body);

  if (!ref) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        `${command} <ORDER_REF>`,
        `Example: ${command} ABCD1234`,
      ),
    });
    return;
  }

  const order = await findOrderByReference(store.id, ref);

  if (!order) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Order Not Found"),
        `No order matched: ${ref}`,
        `Store: ${store.name}`,
      ),
    });
    return;
  }

  const nextStatus = command === "CONFIRM" ? "confirmed" : "rejected";

  const supabase = createAdminSupabaseClient();
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", order.id)
    .eq("store_id", store.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const shortRef = String(order.id).slice(0, 8).toUpperCase();

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle(`Order #${shortRef} Updated`),
      `New status: ${formatBotStatus(nextStatus)}`,
    ),
  });

  const customerPhone = String(order.customer_whatsapp ?? "");

  if (customerPhone && customerPhone !== "unknown") {
    const customerMessage =
      command === "CONFIRM"
        ? `Your order #${shortRef} has been confirmed by ${store.name}. We will keep you updated.`
        : `Your order #${shortRef} was rejected by ${store.name}. Please message the vendor for details.`;

    await sendWhatsAppTextMessage({
      to: customerPhone,
      message: waMessage(
        waTitle(`Order #${shortRef}`),
        customerMessage,
      ),
    });
  }
}

export async function handleListOrders(from: string, store: StoreForCommand) {
  const supabase = createAdminSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, customer_name, status, total_amount, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  if (!orders || orders.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("No Orders"),
        `No recent orders found for ${store.name}.`,
      ),
    });
    return;
  }

  const lines = orders.map((order) => {
    const shortRef = String(order.id).slice(0, 8).toUpperCase();
    return `#${shortRef} | ${formatBotStatus(order.status)} | ${formatNaira(Number(order.total_amount))}`;
  });

  await sendPaginatedList({
    to: from,
    role: "vendor",
    title: `Recent Orders - ${store.name}`,
    lines,
    pageSize: 5,
    paginateWhenAtLeast: 9,
    emptyMessage: waMessage(waTitle("No Orders"), `No recent orders found for ${store.name}.`),
    hint: "Tip: Use CONFIRM <ORDER_REF> or REJECT <ORDER_REF>.",
  });
}

export async function handleSalesToday(from: string, store: StoreForCommand) {
  const supabase = createAdminSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount, status")
    .eq("store_id", store.id)
    .gte("created_at", todayStartIso());

  if (error) {
    throw new Error(error.message);
  }

  const confirmedOrders = (orders ?? []).filter(
    (order) => String((order as { status?: string | null }).status ?? "") === "confirmed",
  );
  const totalRevenue = confirmedOrders.reduce(
    (sum, order) => sum + Number((order as { total_amount?: number | null }).total_amount ?? 0),
    0,
  );
  const pendingRequests = (orders ?? []).filter(
    (order) => String((order as { status?: string | null }).status ?? "") === "pending_whatsapp",
  ).length;

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle(`Sales Today - ${store.name}`),
      `Confirmed revenue: ${formatNaira(totalRevenue)}`,
      `Confirmed orders: ${confirmedOrders.length}`,
      `Pending requests: ${pendingRequests}`,
    ),
  });
}

export async function handleLowStock(from: string, store: StoreForCommand) {
  const supabase = createAdminSupabaseClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("name, stock_count")
    .eq("store_id", store.id)
    .lte("stock_count", 2)
    .eq("is_available", true)
    .order("stock_count", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  if (!products || products.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle(`Low Stock - ${store.name}`),
        "No low-stock alerts right now.",
      ),
    });
    return;
  }

  const lines = products.map((product) => `${product.name}: ${product.stock_count} left`);

  await sendPaginatedList({
    to: from,
    role: "vendor",
    title: `Low Stock - ${store.name}`,
    lines,
    pageSize: 5,
    paginateWhenAtLeast: 9,
    emptyMessage: waMessage(waTitle("Low Stock"), "No low-stock alerts right now."),
    hint: "Tip: Update inventory from dashboard products page.",
  });
}

export async function handleBroadcast(from: string, body: string, store: StoreForCommand) {
  const message = extractBroadcastMessage(body);

  if (!message) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "BROADCAST <message>",
        "Example: BROADCAST Flash sale today: 10% off all items.",
      ),
    });
    return;
  }

  const result = await executeBroadcastNow({
    vendorId: store.vendor_id,
    storeId: store.id,
    message,
    targetScope: "followers",
  });

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Broadcast Sent"),
      `Targets: ${result.targetCount}`,
      `Delivered: ${result.sentCount}`,
      `Failed: ${result.failedCount}`,
    ),
  });
}

export async function handleBroadcastStatus(from: string, store: StoreForCommand) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .select("id, status, scheduled_at, sent_at, sent_count, failed_count, message, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  const rows =
    (data ?? []) as Array<{
      id: string;
      status: string;
      scheduled_at?: string | null;
      sent_at?: string | null;
      sent_count?: number | null;
      failed_count?: number | null;
      message?: string | null;
    }>;

  if (rows.length === 0) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle(`Broadcast Status - ${store.name}`),
        "No broadcast history yet.",
      ),
    });
    return;
  }

  const lines = rows.map((row) => {
    const shortId = String(row.id).slice(0, 8).toUpperCase();
    const status = formatBotStatus(String(row.status ?? "unknown"));
    const sent = Number(row.sent_count ?? 0);
    const failed = Number(row.failed_count ?? 0);
    const when = row.scheduled_at ?? row.sent_at ?? "";
    const whenText = when ? new Date(when).toISOString().slice(0, 16).replace("T", " ") : "-";
    return `#${shortId} | ${status} | ok:${sent} fail:${failed} | ${whenText}`;
  });

  await sendPaginatedList({
    to: from,
    role: "vendor",
    title: `Broadcast Status - ${store.name}`,
    lines,
    pageSize: 5,
    paginateWhenAtLeast: 9,
    emptyMessage: waMessage(waTitle("Broadcast Status"), "No broadcast history yet."),
    hint: "Tip: Send BROADCAST <message> to create a campaign.",
  });
}

export async function handleScheduleBroadcast(from: string, body: string, store: StoreForCommand) {
  const parsed = parseScheduleBroadcastInput(body);

  if (!parsed) {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Usage"),
        "SCHEDULE BROADCAST <date time> | <message>",
        "Examples:",
        waList([
          "2026-04-30 14:00 | Flash sale starts now",
          "30/04/2026 14:00 | Flash sale starts now",
          "tomorrow 2pm | Flash sale starts now",
        ]),
      ),
    });
    return;
  }

  const result = await scheduleBroadcast({
    vendorId: store.vendor_id,
    storeId: store.id,
    message: parsed.message,
    scheduledAt: parsed.scheduledAt,
    targetScope: "followers",
  });

  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Broadcast Scheduled"),
      `Time: ${result.scheduledAt}`,
      `ID: ${result.broadcastId.slice(0, 8).toUpperCase()}`,
    ),
  });
}
