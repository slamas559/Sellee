import { formatNaira } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { executeBroadcastNow, scheduleBroadcast } from "@/lib/whatsapp-bot/broadcasts";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { extractRef, todayStartIso } from "@/lib/whatsapp-bot/parse";
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

function parseFlexibleScheduleDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const isoParsed = new Date(trimmed);
  if (!Number.isNaN(isoParsed.getTime())) {
    return isoParsed;
  }

  const ymdMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (ymdMatch) {
    const [, y, m, d, hh = "0", mm = "0"] = ymdMatch;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0,
    );
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const dmyMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (dmyMatch) {
    const [, d, m, y, hh = "0", mm = "0"] = dmyMatch;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0,
    );
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export async function handleLinkCommand(from: string, body: string) {
  const code = extractRef(body);

  if (!code) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "Usage: LINK <CODE>. Generate code from Sellee dashboard first.",
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
      message: "Invalid or expired link code. Generate a new code from your dashboard.",
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
      message:
        "This number is already linked to another vendor account. Contact support if this is incorrect.",
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
    message:
      "WhatsApp linked successfully. You can now run commands: LIST ORDERS, SALES TODAY, LOW STOCK, CONFIRM <ORDER_REF>, REJECT <ORDER_REF>, BROADCAST <message>, SCHEDULE BROADCAST <ISO_DATE_TIME> | <message>",
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
      message: `Usage: ${command} <ORDER_REF>. Example: ${command} ABCD1234`,
    });
    return;
  }

  const order = await findOrderByReference(store.id, ref);

  if (!order) {
    await sendWhatsAppTextMessage({
      to: from,
      message: `Order ${ref} not found for ${store.name}.`,
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
    message: `Order #${shortRef} marked as ${nextStatus}.`,
  });

  const customerPhone = String(order.customer_whatsapp ?? "");

  if (customerPhone && customerPhone !== "unknown") {
    const customerMessage =
      command === "CONFIRM"
        ? `Your order #${shortRef} has been confirmed by ${store.name}. We will keep you updated.`
        : `Your order #${shortRef} was rejected by ${store.name}. Please message the vendor for details.`;

    await sendWhatsAppTextMessage({
      to: customerPhone,
      message: customerMessage,
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
      message: `No orders found for ${store.name}.`,
    });
    return;
  }

  const lines = orders.map((order) => {
    const shortRef = String(order.id).slice(0, 8).toUpperCase();
    return `#${shortRef} | ${order.status} | ${formatNaira(Number(order.total_amount))}`;
  });

  await sendWhatsAppTextMessage({
    to: from,
    message: `Recent orders (${store.name}):\n${lines.join("\n")}`,
  });
}

export async function handleSalesToday(from: string, store: StoreForCommand) {
  const supabase = createAdminSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("store_id", store.id)
    .gte("created_at", todayStartIso());

  if (error) {
    throw new Error(error.message);
  }

  const totalRevenue = (orders ?? []).reduce(
    (sum, order) => sum + Number(order.total_amount ?? 0),
    0,
  );

  await sendWhatsAppTextMessage({
    to: from,
    message: `Sales today (${store.name}): ${formatNaira(totalRevenue)} from ${orders?.length ?? 0} orders.`,
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
      message: `No low-stock alerts for ${store.name}.`,
    });
    return;
  }

  const lines = products.map((product) => `${product.name}: ${product.stock_count} left`);

  await sendWhatsAppTextMessage({
    to: from,
    message: `Low stock (${store.name}):\n${lines.join("\n")}`,
  });
}

export async function handleBroadcast(from: string, body: string, store: StoreForCommand) {
  const message = extractBroadcastMessage(body);

  if (!message) {
    await sendWhatsAppTextMessage({
      to: from,
      message: "Usage: BROADCAST <message>. Example: BROADCAST Flash sale today: 10% off all items.",
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
    message: `Broadcast sent. Delivered: ${result.sentCount}, Failed: ${result.failedCount}, Targets: ${result.targetCount}.`,
  });
}

export async function handleScheduleBroadcast(from: string, body: string, store: StoreForCommand) {
  const parsed = parseScheduleBroadcastInput(body);

  if (!parsed) {
    await sendWhatsAppTextMessage({
      to: from,
      message:
        "Usage: SCHEDULE BROADCAST <date time> | <message>. Examples: 2026-04-30 14:00 | Flash sale starts now OR 30/04/2026 14:00 | Flash sale starts now.",
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
    message: `Broadcast scheduled for ${result.scheduledAt}. ID: ${result.broadcastId.slice(0, 8).toUpperCase()}.`,
  });
}
