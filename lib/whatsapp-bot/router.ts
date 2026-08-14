import { logServerInfo } from "@/lib/logger";
import { classifyIntentWithAI } from "@/lib/whatsapp-bot/ai-intent";
import {
  getPendingBroadcastConfirm,
  handleBroadcastConfirmReply,
  savePendingBroadcastConfirm,
} from "@/lib/whatsapp-bot/broadcast-confirm";
import { waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { verifyByWhatsAppCommand } from "@/lib/phone-verification";
import { handleMorePagination } from "@/lib/whatsapp-bot/pagination";
import { extractRef, type BotCommand, inferCommand } from "@/lib/whatsapp-bot/parse";
import { resolveVendorStoreByPhone } from "@/lib/whatsapp-bot/repository";
import { handleCustomerCommand } from "@/lib/whatsapp-bot/customer-commands";
import { getPendingReview, handleReviewReply } from "@/lib/whatsapp-bot/reviews";
import {
  handleBroadcast,
  handleBroadcastStatus,
  handleConfirmReject,
  handleLinkCommand,
  handleListOrders,
  handleLowStock,
  handleScheduleBroadcast,
  handleSalesToday,
  handleMarkDelivered,
} from "@/lib/whatsapp-bot/vendor-commands";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import type { WebhookDebugResult } from "@/lib/whatsapp-bot/types";

const VENDOR_HELP = waMessage(
  waTitle("Vendor Commands"),
  waList([
    "LIST ORDERS - shows recent orders",
    "CONFIRM <ref> - confirm one order",
    "REJECT <ref> - reject one order",
    "DELIVERED <ref> - mark order as delivered",
    "SALES TODAY - confirmed revenue summary for today",
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
    "MY CONFIRMED ORDERS - only confirmed orders",
    "MY REJECTED ORDERS - only rejected orders",
    "MY PENDING ORDERS - only pending orders",
    "MY STATUS - quick status snapshot",
    "TRACK <ref> - order details",
    "CANCEL <ref> - cancel pending order",
    "SEARCH <product> - find products",
    "SEARCH <product> under <amount> - price limit",
    "FOLLOW <store> - get store updates",
    "UNFOLLOW <store> - stop updates",
    "MY FOLLOWS - list followed stores",
    "MORE - next page for very long lists",
  ]),
  waTitle("Vendor Linking"),
  "Generate a code in dashboard integrations, then send:",
  "LINK <code>",
  waTitle("Phone Verification"),
  "During account signup/phone change you may receive:",
  "VERIFY <code>",
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

export async function routeIncomingText(from: string, rawBody: string): Promise<WebhookDebugResult> {
  const initialCommand = inferCommand(rawBody);

  logServerInfo("whatsapp.webhook.inferred", {
    from,
    command: initialCommand,
    body: rawBody.slice(0, 120),
  });

  const pendingReview = await getPendingReview(from);
  if (pendingReview) {
    const handled = await handleReviewReply(from, rawBody, pendingReview);
    if (handled) {
      return {
        from,
        body: rawBody,
        inferred_command: "REVIEW_REPLY",
        role: "customer",
        scope_store_id: pendingReview.store_id ?? null,
        status: "ok",
      };
    }
  }

  const pendingBroadcastConfirm = await getPendingBroadcastConfirm(from);
  if (pendingBroadcastConfirm) {
    await handleBroadcastConfirmReply(from, rawBody, pendingBroadcastConfirm);
    return {
      from,
      body: rawBody,
      inferred_command: "BROADCAST_CONFIRM_REPLY",
      role: "vendor",
      scope_store_id: pendingBroadcastConfirm.storeId,
      status: "ok",
    };
  }

  // AI intent fallback (Sprint D): only kicks in when the deterministic
  // parser found nothing at all. It never overrides a real match, an
  // ambiguous match, LINK/VERIFY, or any other already-handled case - it
  // only gets a shot at messages that would otherwise just show a HELP menu.
  let command: BotCommand = initialCommand;
  let body = rawBody;
  let aiAssisted = false;

  if (initialCommand === "UNKNOWN") {
    const canonical = await classifyIntentWithAI(rawBody);
    if (canonical) {
      command = inferCommand(canonical);
      body = canonical;
      aiAssisted = true;

      logServerInfo("whatsapp.webhook.ai_reinterpreted", {
        from,
        original: rawBody.slice(0, 120),
        canonical,
        command,
      });
    }
  }

  function result(
    body: string,
    command: string,
    role: "vendor" | "customer" | "system",
    scopeStoreId?: string | null,
  ): WebhookDebugResult {
    return {
      from,
      body: rawBody,
      inferred_command: command,
      role,
      scope_store_id: scopeStoreId ?? null,
      status: "ok",
      ...(aiAssisted ? { ai_interpreted_as: body } : {}),
    };
  }

  if (aiAssisted) {
    // Transparency notice: the user should always know when we guessed at
    // intent, so they can correct us if the guess was wrong.
    await sendWhatsAppTextMessage({
      to: from,
      message: `🤖 Got it — reading that as: *${body}*`,
    });
  }

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
    return result(body, command, "system");
  }

  if (command === "LINK") {
    await handleLinkCommand(from, body);
    return result(body, command, "vendor");
  }

  if (command === "VERIFY") {
    const code = extractRef(body);
    if (!code) {
      await sendWhatsAppTextMessage({
        to: from,
        message: waMessage(
          waTitle("Usage"),
          "VERIFY <CODE>",
          "Example: VERIFY 123456",
        ),
      });
      return result(body, command, "system");
    }

    const verifyResult = await verifyByWhatsAppCommand({
      fromPhone: from,
      verifyCode: code,
    });

    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        verifyResult.completed ? waTitle("Verification Successful") : waTitle("Verification Failed"),
        verifyResult.message,
      ),
    });
    return result(body, command, "system");
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
    return result(body, command, "system");
  }

  const customerResult = await handleCustomerCommand(from, body, command);
  if (customerResult.handled) {
    return result(body, command, "customer", customerResult.scopeStoreId);
  }

  const store = await resolveVendorStoreByPhone(from);

  if (store) {
    switch (command) {
      case "CONFIRM":
        await handleConfirmReject("CONFIRM", body, from, store);
        return result(body, command, "vendor", store.id);

      case "REJECT":
        await handleConfirmReject("REJECT", body, from, store);
        return result(body, command, "vendor", store.id);

      case "LIST ORDERS":
        await handleListOrders(from, store);
        return result(body, command, "vendor", store.id);

      case "SALES TODAY":
        await handleSalesToday(from, store);
        return result(body, command, "vendor", store.id);

      case "LOW STOCK":
        await handleLowStock(from, store);
        return result(body, command, "vendor", store.id);

      case "BROADCAST": {
        const canonicalBody = toCanonicalVendorBody(command, body);
        if (aiAssisted) {
          await savePendingBroadcastConfirm({
            phone: from,
            storeId: store.id,
            command: "BROADCAST",
            canonicalBody,
            originalMessage: rawBody,
          });
          await sendWhatsAppTextMessage({
            to: from,
            message: waMessage(
              waTitle("Confirm Broadcast"),
              `This will message all followers of *${store.name}*:`,
              `"${canonicalBody.slice("BROADCAST ".length)}"`,
              waList(["Reply YES to send", "Reply NO to cancel"]),
            ),
          });
          return result(canonicalBody, command, "vendor", store.id);
        }
        await handleBroadcast(from, canonicalBody, store);
        return result(body, command, "vendor", store.id);
      }

      case "BROADCAST STATUS":
        await handleBroadcastStatus(from, store);
        return result(body, command, "vendor", store.id);

      case "SCHEDULE BROADCAST": {
        const canonicalBody = toCanonicalVendorBody(command, body);
        if (aiAssisted) {
          await savePendingBroadcastConfirm({
            phone: from,
            storeId: store.id,
            command: "SCHEDULE BROADCAST",
            canonicalBody,
            originalMessage: rawBody,
          });
          await sendWhatsAppTextMessage({
            to: from,
            message: waMessage(
              waTitle("Confirm Scheduled Broadcast"),
              `This will schedule a message to followers of *${store.name}*:`,
              `"${canonicalBody.slice("SCHEDULE BROADCAST ".length)}"`,
              waList(["Reply YES to schedule", "Reply NO to cancel"]),
            ),
          });
          return result(canonicalBody, command, "vendor", store.id);
        }
        await handleScheduleBroadcast(from, canonicalBody, store);
        return result(body, command, "vendor", store.id);
      }

      case "MARK DELIVERED":
        await handleMarkDelivered(from, body, store);
        return result(body, command, "vendor", store.id);

      case "HELP":
      case "UNKNOWN":
      default:
        await sendWhatsAppTextMessage({ to: from, message: VENDOR_HELP });
        return result(body, command, "vendor", store.id);
    }
  }

  logServerInfo("whatsapp.webhook.unlinked", { from, command });
  await sendWhatsAppTextMessage({ to: from, message: UNLINKED_HELP });
  return result(body, command, "system");
}