import { logServerInfo } from "@/lib/logger";
import { waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { handleMorePagination } from "@/lib/whatsapp-bot/pagination";
import { type BotCommand, inferCommand } from "@/lib/whatsapp-bot/parse";
import { resolveVendorStoreByPhone } from "@/lib/whatsapp-bot/repository";
import { handleCustomerCommand } from "@/lib/whatsapp-bot/customer-commands";
import {
  handleBroadcast,
  handleBroadcastStatus,
  handleConfirmReject,
  handleLinkCommand,
  handleListOrders,
  handleLowStock,
  handleScheduleBroadcast,
  handleSalesToday,
} from "@/lib/whatsapp-bot/vendor-commands";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import type { WebhookDebugResult } from "@/lib/whatsapp-bot/types";

const VENDOR_HELP = waMessage(
  waTitle("Vendor Commands"),
  waList([
    "LIST ORDERS - shows recent orders",
    "CONFIRM <ref> - confirm one order",
    "REJECT <ref> - reject one order",
    "SALES TODAY - today's revenue summary",
    "LOW STOCK - products needing restock",
    "BROADCAST <message> - send promo now",
    "BROADCAST STATUS - campaign delivery results",
    "SCHEDULE BROADCAST <date> | <message> - send later",
    "LINK <code> - connect WhatsApp to vendor account",
    "MORE - next page for long lists",
  ]),
  "Customer commands also work from your number.",
  "Send HI for a quick intro.",
);

const UNLINKED_HELP = waMessage(
  waTitle("Welcome to Sellee Bot"),
  waTitle("Customer Commands"),
  waList([
    "MY ORDERS - shows your recent orders",
    "MY STATUS - quick status snapshot",
    "TRACK <ref> - order details",
    "CANCEL <ref> - cancel pending order",
    "SEARCH <product> - find products",
    "FOLLOW <store> - get store updates",
    "UNFOLLOW <store> - stop updates",
    "MY FOLLOWS - list followed stores",
    "MORE - next page for long lists",
  ]),
  waTitle("Vendor Linking"),
  "Generate a code in dashboard integrations, then send:",
  "LINK <code>",
  "Send HI to learn more.",
);

function toCanonicalVendorBody(command: BotCommand, body: string): string {
  const trimmed = body.trim();
  const upper = trimmed.toUpperCase();

  if (command === "BROADCAST") {
    if (upper.startsWith("ANNOUNCE ")) {
      return `BROADCAST ${trimmed.slice("ANNOUNCE".length).trim()}`;
    }
    if (upper.startsWith("MESSAGE CUSTOMERS ")) {
      return `BROADCAST ${trimmed.slice("MESSAGE CUSTOMERS".length).trim()}`;
    }
    if (upper.startsWith("SEND MESSAGE TO CUSTOMERS ")) {
      return `BROADCAST ${trimmed.slice("SEND MESSAGE TO CUSTOMERS".length).trim()}`;
    }
  }

  if (command === "SCHEDULE BROADCAST") {
    if (upper.startsWith("SCHEDULE ANNOUNCEMENT ")) {
      return `SCHEDULE BROADCAST ${trimmed.slice("SCHEDULE ANNOUNCEMENT".length).trim()}`;
    }
    if (upper.startsWith("SCHEDULE MESSAGE ")) {
      return `SCHEDULE BROADCAST ${trimmed.slice("SCHEDULE MESSAGE".length).trim()}`;
    }
  }

  return body;
}

export async function routeIncomingText(from: string, body: string): Promise<WebhookDebugResult> {
  const command = inferCommand(body);

  logServerInfo("whatsapp.webhook.inferred", {
    from,
    command,
    body: body.slice(0, 120),
  });

  if (command === "AMBIGUOUS") {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Ambiguous Request"),
        "I found multiple actions in your message.",
        "Please send one command at a time.",
        waTitle("Examples"),
        waList([
          "TRACK ABCD1234",
          "CANCEL ABCD1234",
          "CONFIRM ABCD1234",
          "REJECT ABCD1234",
          "SEARCH rice",
          "LIST ORDERS",
        ]),
      ),
    });
    return result(from, body, command, "system");
  }

  if (command === "LINK") {
    await handleLinkCommand(from, body);
    return result(from, body, command, "vendor");
  }

  if (command === "MORE") {
    const hasMore = await handleMorePagination(from);
    if (!hasMore) {
      await sendWhatsAppTextMessage({
        to: from,
        message: waMessage(
          waTitle("Nothing More To Show"),
          "No active paginated results found.",
          "Run a list command first, then send MORE.",
        ),
      });
    }
    return result(from, body, command, "system");
  }

  const customerResult = await handleCustomerCommand(from, body, command);
  if (customerResult.handled) {
    return result(from, body, command, "customer", customerResult.scopeStoreId);
  }

  const store = await resolveVendorStoreByPhone(from);

  if (store) {
    switch (command) {
      case "CONFIRM":
        await handleConfirmReject("CONFIRM", body, from, store);
        return result(from, body, command, "vendor", store.id);

      case "REJECT":
        await handleConfirmReject("REJECT", body, from, store);
        return result(from, body, command, "vendor", store.id);

      case "LIST ORDERS":
        await handleListOrders(from, store);
        return result(from, body, command, "vendor", store.id);

      case "SALES TODAY":
        await handleSalesToday(from, store);
        return result(from, body, command, "vendor", store.id);

      case "LOW STOCK":
        await handleLowStock(from, store);
        return result(from, body, command, "vendor", store.id);

      case "BROADCAST":
        await handleBroadcast(from, toCanonicalVendorBody(command, body), store);
        return result(from, body, command, "vendor", store.id);

      case "BROADCAST STATUS":
        await handleBroadcastStatus(from, store);
        return result(from, body, command, "vendor", store.id);

      case "SCHEDULE BROADCAST":
        await handleScheduleBroadcast(from, toCanonicalVendorBody(command, body), store);
        return result(from, body, command, "vendor", store.id);

      case "HELP":
      case "UNKNOWN":
      default:
        await sendWhatsAppTextMessage({ to: from, message: VENDOR_HELP });
        return result(from, body, command, "vendor", store.id);
    }
  }

  logServerInfo("whatsapp.webhook.unlinked", { from, command });
  await sendWhatsAppTextMessage({ to: from, message: UNLINKED_HELP });
  return result(from, body, command, "system");
}

function result(
  from: string,
  body: string,
  command: string,
  role: "vendor" | "customer" | "system",
  scopeStoreId?: string | null,
): WebhookDebugResult {
  return {
    from,
    body,
    inferred_command: command,
    role,
    scope_store_id: scopeStoreId ?? null,
    status: "ok",
  };
}
