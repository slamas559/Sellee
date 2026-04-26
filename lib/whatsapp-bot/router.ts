import { logServerInfo } from "@/lib/logger";
import { inferCommand } from "@/lib/whatsapp-bot/parse";
import { resolveVendorStoreByPhone } from "@/lib/whatsapp-bot/repository";
import { handleCustomerCommand } from "@/lib/whatsapp-bot/customer-commands";
import {
  handleBroadcast,
  handleConfirmReject,
  handleLinkCommand,
  handleListOrders,
  handleLowStock,
  handleScheduleBroadcast,
  handleSalesToday,
} from "@/lib/whatsapp-bot/vendor-commands";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import type { WebhookDebugResult } from "@/lib/whatsapp-bot/types";

export async function routeIncomingText(from: string, body: string): Promise<WebhookDebugResult> {
  const normalized = body.trim().toUpperCase();
  const inferredCommand = inferCommand(body);

  if (normalized.startsWith("LINK ")) {
    await handleLinkCommand(from, body);
    return {
      from,
      body,
      inferred_command: inferredCommand,
      role: "vendor",
      status: "ok",
    };
  }

  const customerResult = await handleCustomerCommand(from, body);
  if (customerResult.handled) {
    return {
      from,
      body,
      inferred_command: inferredCommand,
      role: "customer",
      scope_store_id: customerResult.scopeStoreId ?? null,
      status: "ok",
    };
  }

  const store = await resolveVendorStoreByPhone(from);

  if (store) {
    if (normalized.startsWith("CONFIRM ")) {
      await handleConfirmReject("CONFIRM", body, from, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    if (normalized.startsWith("REJECT ")) {
      await handleConfirmReject("REJECT", body, from, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    if (normalized === "LIST ORDERS") {
      await handleListOrders(from, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    if (normalized === "SALES TODAY") {
      await handleSalesToday(from, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    if (normalized === "LOW STOCK") {
      await handleLowStock(from, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    if (normalized.startsWith("BROADCAST ")) {
      await handleBroadcast(from, body, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    if (normalized.startsWith("SCHEDULE BROADCAST ")) {
      await handleScheduleBroadcast(from, body, store);
      return {
        from,
        body,
        inferred_command: inferredCommand,
        role: "vendor",
        scope_store_id: store.id,
        status: "ok",
      };
    }

    await sendWhatsAppTextMessage({
      to: from,
      message:
        "Vendor commands: LINK <CODE>, LIST ORDERS, SALES TODAY, LOW STOCK, CONFIRM <ORDER_REF>, REJECT <ORDER_REF>, BROADCAST <message>, SCHEDULE BROADCAST <date time> | <message>. Customer commands: MY ORDERS, TRACK <ORDER_REF>, CANCEL <ORDER_REF>, FOLLOW <STORE>, UNFOLLOW <STORE>, MY FOLLOWS.",
    });
    return {
      from,
      body,
      inferred_command: inferredCommand,
      role: "vendor",
      scope_store_id: store.id,
      status: "ok",
    };
  }

  logServerInfo("whatsapp.webhook.customer.unlinked", { from, inferredCommand });
  await sendWhatsAppTextMessage({
    to: from,
    message:
      "If you are a vendor, generate a code in dashboard and send LINK <code>. Customer commands: MY ORDERS, TRACK <ORDER_REF>, CANCEL <ORDER_REF>, FOLLOW <STORE>, UNFOLLOW <STORE>, MY FOLLOWS.",
  });

  return { from, body, inferred_command: inferredCommand, role: "system", status: "ok" };
}
