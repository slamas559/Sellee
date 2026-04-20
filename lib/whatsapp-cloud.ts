import { getRequiredEnv } from "@/lib/env";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

type SendWhatsAppTextMessageParams = {
  to: string;
  message: string;
  previewUrl?: boolean;
};

export async function sendWhatsAppTextMessage({
  to,
  message,
  previewUrl = false,
}: SendWhatsAppTextMessageParams): Promise<void> {
  const token = getRequiredEnv("WHATSAPP_TOKEN");
  const phoneNumberId = getRequiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

  const normalizedTo = normalizeWhatsAppNumber(to);

  if (!normalizedTo) {
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
    throw new Error(`WhatsApp send failed (${response.status}): ${body}`);
  }
}
