import { logServerInfo } from "@/lib/logger";
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

const VENDOR_HELP = `Vendor commands:
Orders: LIST ORDERS, CONFIRM <ref>, REJECT <ref>
Sales: SALES TODAY, LOW STOCK
Marketing: BROADCAST <msg>, BROADCAST STATUS, SCHEDULE BROADCAST <date> | <msg>
Account: LINK <code>

Customer commands also work from your number.
Send HI for a quick intro.`;

const UNLINKED_HELP = `Hi! Here is what I can do:

Customer: MY ORDERS, MY STATUS, TRACK <ref>, CANCEL <ref>, SEARCH <product>, FOLLOW <store>, MY FOLLOWS
Vendor: Generate a link code in your dashboard then send LINK <code>

Send HI to learn more.`;

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
      message:
        "I found multiple actions in your message. Please send one command at a time.\n\nExamples:\nTRACK ABCD1234\nCANCEL ABCD1234\nCONFIRM ABCD1234\nREJECT ABCD1234\nSEARCH rice\nLIST ORDERS",
    });
    return result(from, body, command, "system");
  }

  if (command === "LINK") {
    await handleLinkCommand(from, body);
    return result(from, body, command, "vendor");
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
