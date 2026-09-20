import { getRequiredEnv } from "@/lib/env";
import { logServerInfo } from "@/lib/logger";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { logOutboundMessage } from "@/lib/whatsapp-bot/logs";

type SendWhatsAppTextMessageParams = {
  to: string;
  message: string;
  previewUrl?: boolean;
  command?: string;
  role?: "vendor" | "customer" | "system";
  scopeStoreId?: string;
  // When set, this send is tied to a specific broadcast row so per-recipient
  // outcomes can later be queried by broadcast_id (see getBroadcastRecipientResults).
  broadcastId?: string;
};

type WhatsAppFailureReason = "window_closed" | "undeliverable" | "error";

// Meta's error codes for the two cases worth distinguishing from a generic
// failure: 131047 is specifically "more than 24 hours since the customer
// last messaged" (the re-engagement window), and 131026 is "message
// undeliverable" (usually not a valid/reachable WhatsApp number). Everything
// else collapses to 'error' - retrying those isn't expected to help in any
// channel-specific way, so there's no value in enumerating every code.
function classifyWhatsAppError(responseBody: string): WhatsAppFailureReason {
  try {
    const parsed = JSON.parse(responseBody) as { error?: { code?: number } };
    const code = parsed?.error?.code;
    if (code === 131047) return "window_closed";
    if (code === 131026) return "undeliverable";
  } catch {
    // Non-JSON body - fall through to generic.
  }
  return "error";
}

export async function sendWhatsAppTextMessage({
  to,
  message,
  previewUrl = false,
  command = "OUTBOUND",
  role = "system",
  scopeStoreId,
  broadcastId,
}: SendWhatsAppTextMessageParams): Promise<{
  messageId: string;
  recipient: string;
}> {
  const token = getRequiredEnv("WHATSAPP_TOKEN");
  const phoneNumberId = getRequiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

  const normalizedTo = normalizeWhatsAppNumber(to);

  if (!normalizedTo) {
    await logOutboundMessage({
      recipientPhone: String(to ?? ""),
      messageText: message,
      command,
      role,
      status: "error",
      errorMessage: "Invalid WhatsApp recipient number.",
      providerPayload: {
        scope_store_id: scopeStoreId ?? null,
      },
      broadcastId,
      failureReason: "error",
    });
    throw new Error("Invalid WhatsApp recipient number.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: {
          preview_url: previewUrl,
          body: message,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    const failureReason = classifyWhatsAppError(body);
    logServerInfo("whatsapp.send.error", {
      to: normalizedTo,
      status: response.status,
      failureReason,
    });
    await logOutboundMessage({
      recipientPhone: normalizedTo,
      messageText: message,
      command,
      role,
      status: "error",
      errorMessage: `WhatsApp send failed (${response.status})`,
      providerPayload: {
        scope_store_id: scopeStoreId ?? null,
        response_status: response.status,
        response_body: body,
      },
      broadcastId,
      failureReason,
    });
    throw new Error(`WhatsApp send failed (${response.status}): ${body}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        messages?: Array<{ id?: string }>;
      }
    | null;

  const messageId = payload?.messages?.[0]?.id ?? "unknown";
  logServerInfo("whatsapp.send.success", {
    to: normalizedTo,
    message_id: messageId,
  });

  await logOutboundMessage({
    recipientPhone: normalizedTo,
    messageText: message,
    whatsappMessageId: messageId,
    command,
    role,
    status: "ok",
    providerPayload: {
      scope_store_id: scopeStoreId ?? null,
      graph_response: payload,
    },
    broadcastId,
  });

  return {
    messageId,
    recipient: normalizedTo,
  };
}