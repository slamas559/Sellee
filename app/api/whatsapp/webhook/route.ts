import { NextResponse } from "next/server";
import { formatNaira } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";

type WhatsAppMessage = {
  from?: string;
  text?: {
    body?: string;
  };
  type?: string;
};

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
};

type WebhookDebugResult = {
  from: string;
  body: string;
  inferred_command: string;
  status: "ok" | "error";
  error?: string;
};

type StoreForCommand = {
  id: string;
  name: string;
  vendor_id: string;
};

function todayStartIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
  return start.toISOString();
}

function extractRef(commandText: string): string | null {
  const parts = commandText.trim().split(/\s+/);
  if (parts.length < 2) {
    return null;
  }

  return parts[1] ?? null;
}

async function resolveVendorStoreByPhone(from: string): Promise<StoreForCommand | null> {
  const supabase = createAdminSupabaseClient();
  const normalizedFrom = normalizeWhatsAppNumber(from);

  let vendorId: string | null = null;

  const { data: linkedVendor, error: linkedVendorError } = await supabase
    .from("whatsapp_vendor_links")
    .select("vendor_id")
    .eq("whatsapp_number", normalizedFrom)
    .eq("is_active", true)
    .maybeSingle();

  if (linkedVendorError) {
    logDevError("whatsapp.resolve.linked-vendor", linkedVendorError, { from });
  }

  if (linkedVendor?.vendor_id) {
    vendorId = String(linkedVendor.vendor_id);
  }

  if (!vendorId) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, phone, role")
      .eq("role", "vendor")
      .not("phone", "is", null);

    if (usersError) {
      throw new Error(usersError.message);
    }

    const vendorUser = (users ?? []).find((user) => {
      const normalizedPhone = normalizeWhatsAppNumber(String(user.phone ?? ""));
      return normalizedPhone === normalizedFrom;
    });

    if (vendorUser?.id) {
      vendorId = String(vendorUser.id);
    }
  }

  if (!vendorId) {
    return null;
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, vendor_id")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (storeError || !store) {
    return null;
  }

  return {
    id: String(store.id),
    name: String(store.name),
    vendor_id: String(store.vendor_id),
  };
}

async function handleLinkCommand(from: string, body: string) {
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
      "WhatsApp linked successfully. You can now run commands: LIST ORDERS, SALES TODAY, LOW STOCK, CONFIRM <ORDER_REF>, REJECT <ORDER_REF>",
  });
}

async function findOrderByReference(storeId: string, rawRef: string) {
  const supabase = createAdminSupabaseClient();
  const ref = rawRef.toLowerCase();
  const isFullUuid = ref.includes("-") && ref.length >= 30;

  if (isFullUuid) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, customer_whatsapp, customer_name, total_amount")
      .eq("store_id", storeId)
      .eq("id", ref)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, customer_whatsapp, customer_name, total_amount")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).find((order) => String(order.id).toLowerCase().startsWith(ref)) ?? null;
}

async function handleConfirmReject(
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

async function handleListOrders(from: string, store: StoreForCommand) {
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

async function handleSalesToday(from: string, store: StoreForCommand) {
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

async function handleLowStock(from: string, store: StoreForCommand) {
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

async function handleIncomingText(from: string, body: string) {
  const normalized = body.trim().toUpperCase();

  if (normalized.startsWith("LINK ")) {
    await handleLinkCommand(from, body);
    return;
  }

  const store = await resolveVendorStoreByPhone(from);

  if (!store) {
    await sendWhatsAppTextMessage({
      to: from,
      message:
        "This number is not linked to a Sellee store yet. Generate a code in dashboard and send LINK <code>.",
    });
    return;
  }

  if (normalized.startsWith("CONFIRM ")) {
    await handleConfirmReject("CONFIRM", body, from, store);
    return;
  }

  if (normalized.startsWith("REJECT ")) {
    await handleConfirmReject("REJECT", body, from, store);
    return;
  }

  if (normalized === "LIST ORDERS") {
    await handleListOrders(from, store);
    return;
  }

  if (normalized === "SALES TODAY") {
    await handleSalesToday(from, store);
    return;
  }

  if (normalized === "LOW STOCK") {
    await handleLowStock(from, store);
    return;
  }

  await sendWhatsAppTextMessage({
    to: from,
    message:
      "Commands: LINK <CODE>, LIST ORDERS, SALES TODAY, LOW STOCK, CONFIRM <ORDER_REF>, REJECT <ORDER_REF>",
  });
}

function inferCommand(body: string): string {
  const normalized = body.trim().toUpperCase();

  if (normalized.startsWith("LINK ")) return "LINK";
  if (normalized.startsWith("CONFIRM ")) return "CONFIRM";
  if (normalized.startsWith("REJECT ")) return "REJECT";
  if (normalized === "LIST ORDERS") return "LIST ORDERS";
  if (normalized === "SALES TODAY") return "SALES TODAY";
  if (normalized === "LOW STOCK") return "LOW STOCK";
  return "UNKNOWN";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return new Response("Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const debugEnabled =
    process.env.WHATSAPP_WEBHOOK_DEBUG === "true" ||
    new URL(request.url).searchParams.get("debug") === "1";

  try {
    const payload = (await request.json()) as WebhookPayload;
    const debugResults: WebhookDebugResult[] = [];

    const messages = payload.entry
      ?.flatMap((entry) => entry.changes ?? [])
      .flatMap((change) => change.value?.messages ?? [])
      .filter((message) => message.type === "text" && message.from && message.text?.body);

    for (const message of messages ?? []) {
      const from = String(message.from);
      const body = String(message.text?.body);
      const inferredCommand = inferCommand(body);

      try {
        await handleIncomingText(from, body);

        if (debugEnabled) {
          debugResults.push({
            from,
            body,
            inferred_command: inferredCommand,
            status: "ok",
          });
        }
      } catch (error) {
        logDevError("whatsapp.webhook.message", error, {
          from,
          body,
        });

        if (debugEnabled) {
          debugResults.push({
            from,
            body,
            inferred_command: inferredCommand,
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Unknown command execution error",
          });
        }
      }
    }

    if (debugEnabled) {
      return NextResponse.json({
        received: true,
        debug: {
          message_count: messages?.length ?? 0,
          results: debugResults,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logDevError("whatsapp.webhook.unhandled", error);

    if (debugEnabled) {
      return NextResponse.json(
        {
          received: false,
          error:
            error instanceof Error ? error.message : "Unknown webhook parse error",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ received: false }, { status: 200 });
  }
}

