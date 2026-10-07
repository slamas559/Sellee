/**
 * lib/whatsapp-bot/receipts.ts
 *
 * Buyer confirmation of a delivered order. After a vendor marks an order
 * delivered, the buyer gets a message asking them to reply RECEIVED. That
 * reply (or finishing the review) sets orders.buyer_confirmed_at, which is
 * what makes the order count toward a vendor's Trusted / Top Seller tier.
 * A vendor marking an order delivered is deliberately NOT enough on its own.
 */

import { logServerInfo } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";

export const RECEIVED_PROMPT_LINE = "Got your order? Reply RECEIVED to confirm.";

const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

// Deliberately strict: only short, unambiguous "I received it" messages. A
// bare "got it" is too common in normal chat to treat as confirmation.
const RECEIVED_PATTERN =
  /^(?:(?:yes|yeah|yep)\s+)?(?:(?:i\s+)?(?:have\s+)?(?:(?:received|collected)\s+(?:it|my\s+order|the\s+order|my\s+item|the\s+item|everything)|got\s+(?:my|the)\s+(?:order|item))|(?:order|item)\s+received|received|collected)(?:\s+(?:thanks|thank\s+you|thx))?$/;

export function isReceivedMessage(rawBody: string): boolean {
  const normalized = rawBody
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return RECEIVED_PATTERN.test(normalized);
}

/**
 * Returns the store id when the message confirmed an order (and was
 * replied to), or null when it wasn't a receipt confirmation, so normal
 * routing carries on.
 */
export async function handleReceivedReply(from: string, rawBody: string): Promise<{ storeId: string } | null> {
  if (!isReceivedMessage(rawBody)) return null;

  const supabase = createAdminSupabaseClient();
  const phone = normalizeWhatsAppNumber(from);
  if (!phone) return null;

  // pending_reviews is created for every delivered order with the buyer's
  // normalized phone, so it's the reliable way back from a WhatsApp number to
  // their orders (orders.customer_whatsapp can be stored in any format).
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const { data: prompts } = await supabase
    .from("pending_reviews")
    .select("order_id, store_id, store_name, completed_at, expires_at")
    .eq("customer_phone", phone)
    .gte("prompted_at", since)
    .order("prompted_at", { ascending: false })
    .limit(10);

  if (!prompts || prompts.length === 0) return null;

  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .in(
      "id",
      prompts.map((prompt) => prompt.order_id as string),
    )
    .eq("status", "delivered")
    .is("buyer_confirmed_at", null);

  const unconfirmed = new Set((orders ?? []).map((order) => order.id as string));
  const target = prompts.find((prompt) => unconfirmed.has(prompt.order_id as string));
  if (!target) return null;

  // The guard keeps a double reply (or a review finishing at the same moment)
  // from overwriting an earlier confirmation.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ buyer_confirmed_at: new Date().toISOString(), buyer_confirmed_via: "received_reply" })
    .eq("id", target.order_id as string)
    .is("buyer_confirmed_at", null)
    .select("id");

  if (error || !updated || updated.length === 0) return null;

  const ref = String(target.order_id).slice(0, 8).toUpperCase();
  const storeName = (target.store_name as string | null) ?? "the store";
  const reviewStillOpen =
    !target.completed_at && new Date(target.expires_at as string).getTime() > Date.now();

  try {
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Thanks for confirming!"),
        `We've recorded that you received order #${ref} from ${storeName}.`,
        reviewStillOpen ? "If you'd like to leave a rating, reply with a number from 1 to 5." : "",
      ),
      command: "ORDER_RECEIVED",
      role: "customer",
      scopeStoreId: target.store_id as string,
    });
  } catch (sendError) {
    logServerInfo("whatsapp.receipts.reply_failed", { from, message: String(sendError) });
  }

  return { storeId: target.store_id as string };
}
