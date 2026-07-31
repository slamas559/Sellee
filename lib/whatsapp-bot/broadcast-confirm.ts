import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { resolveVendorStoreByPhone } from "@/lib/whatsapp-bot/repository";
import { handleBroadcast, handleScheduleBroadcast } from "@/lib/whatsapp-bot/vendor-commands";

/**
 * Confirm-before-broadcast guard (Sprint D follow-up).
 *
 * When the AI intent layer (ai-intent.ts) guesses that a vendor's free-text
 * message means BROADCAST or SCHEDULE BROADCAST, we do NOT send it straight
 * away. A misread here would blast every follower/customer with something
 * the vendor never actually asked to send. Instead we park the canonical
 * command in `bot_conversations` (same table already used for pagination
 * state) and ask the vendor to reply YES/NO first.
 *
 * Deterministic, explicitly-typed "BROADCAST <message>" from a vendor is
 * NOT affected by this guard - that's already a deliberate action, so it
 * still sends immediately as before.
 */

const CONFIRM_STATE = "awaiting_broadcast_confirm";
const CONFIRM_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

type PendingBroadcastPayload = {
  kind: "broadcast_confirm";
  command: "BROADCAST" | "SCHEDULE BROADCAST";
  canonicalBody: string;
  storeId: string;
  originalMessage: string;
};

export type PendingBroadcastConfirm = {
  storeId: string;
  command: "BROADCAST" | "SCHEDULE BROADCAST";
  canonicalBody: string;
};

const CONFIRM_WORDS = new Set(["YES", "Y", "SEND", "CONFIRM", "CONFIRM BROADCAST", "OK", "OKAY", "GO", "GO AHEAD"]);
const CANCEL_WORDS = new Set(["NO", "N", "CANCEL", "STOP", "DONT SEND", "DON'T SEND", "ABORT"]);

export async function savePendingBroadcastConfirm(params: {
  phone: string;
  storeId: string;
  command: "BROADCAST" | "SCHEDULE BROADCAST";
  canonicalBody: string;
  originalMessage: string;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const phone = normalizeWhatsAppNumber(params.phone);
  const nowIso = new Date().toISOString();

  const payload: PendingBroadcastPayload = {
    kind: "broadcast_confirm",
    command: params.command,
    canonicalBody: params.canonicalBody,
    storeId: params.storeId,
    originalMessage: params.originalMessage,
  };

  const { error } = await supabase.from("bot_conversations").upsert(
    {
      phone,
      role: "vendor",
      state: CONFIRM_STATE,
      payload,
      last_message_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "phone" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function clearPendingBroadcastConfirm(phone: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const normalized = normalizeWhatsAppNumber(phone);
  const nowIso = new Date().toISOString();

  await supabase.from("bot_conversations").upsert(
    {
      phone: normalized,
      role: "vendor",
      state: "idle",
      payload: {},
      last_message_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "phone" },
  );
}

/**
 * Looks up a pending, not-yet-expired broadcast confirmation for this phone.
 * Call this in router.ts BEFORE inferCommand, same shape as getPendingReview().
 */
export async function getPendingBroadcastConfirm(
  phone: string,
): Promise<PendingBroadcastConfirm | null> {
  const supabase = createAdminSupabaseClient();
  const normalized = normalizeWhatsAppNumber(phone);

  const { data, error } = await supabase
    .from("bot_conversations")
    .select("state, payload, updated_at")
    .eq("phone", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.state !== CONFIRM_STATE) {
    return null;
  }

  const updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
  if (Date.now() - updatedAt > CONFIRM_WINDOW_MS) {
    // Stale - clear it silently so a random later message doesn't resurrect it.
    await clearPendingBroadcastConfirm(normalized);
    return null;
  }

  const payload = data.payload as Partial<PendingBroadcastPayload>;
  if (!payload || payload.kind !== "broadcast_confirm" || !payload.canonicalBody || !payload.storeId) {
    return null;
  }

  return {
    storeId: payload.storeId,
    command: payload.command === "SCHEDULE BROADCAST" ? "SCHEDULE BROADCAST" : "BROADCAST",
    canonicalBody: payload.canonicalBody,
  };
}

/**
 * Processes a reply while a broadcast confirmation is pending.
 * Returns true  -> handled (don't route to inferCommand)
 * Returns false -> not a yes/no reply, re-prompt and still treat as handled
 *                  by the caller (we always return true here; there is no
 *                  legitimate reason to silently fall through mid-confirm).
 */
export async function handleBroadcastConfirmReply(
  from: string,
  body: string,
  pending: PendingBroadcastConfirm,
): Promise<boolean> {
  const normalized = body.trim().toUpperCase();

  if (CANCEL_WORDS.has(normalized)) {
    await clearPendingBroadcastConfirm(from);
    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(waTitle("Broadcast Cancelled"), "Nothing was sent."),
    });
    return true;
  }

  if (CONFIRM_WORDS.has(normalized)) {
    await clearPendingBroadcastConfirm(from);

    const store = await resolveVendorStoreByPhone(from);
    if (!store || store.id !== pending.storeId) {
      await sendWhatsAppTextMessage({
        to: from,
        message: waMessage(
          waTitle("Couldn't Send"),
          "Your vendor account link changed since this was requested. Please resend the broadcast.",
        ),
      });
      return true;
    }

    if (pending.command === "SCHEDULE BROADCAST") {
      await handleScheduleBroadcast(from, pending.canonicalBody, store);
    } else {
      await handleBroadcast(from, pending.canonicalBody, store);
    }
    return true;
  }

  // Anything else: re-prompt, keep the pending state alive.
  await sendWhatsAppTextMessage({
    to: from,
    message: waMessage(
      waTitle("Still Waiting On Your Confirmation"),
      `Send this broadcast?`,
      waList(["Reply YES to send", "Reply NO to cancel"]),
    ),
  });
  return true;
}