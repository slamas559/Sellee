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
};

export async function sendWhatsAppTextMessage({
  to,
  message,
  previewUrl = false,
  command = "OUTBOUND",
  role = "system",
  scopeStoreId,
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
    logServerInfo("whatsapp.send.error", {
      to: normalizedTo,
      status: response.status,
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
  });

  return {
    messageId,
    recipient: normalizedTo,
  };
}
