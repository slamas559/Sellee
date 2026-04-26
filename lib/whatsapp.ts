import { formatNaira } from "@/lib/format";

type BuildOrderMessageParams = {
  productName: string;
  quantity: number;
  total: number;
  storeName: string;
  orderReference?: string;
  customerName?: string;
};

export function normalizeWhatsAppNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function validateWhatsAppNumber(value: string): {
  ok: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeWhatsAppNumber(value);

  if (!normalized) {
    return {
      ok: false,
      normalized,
      error: "WhatsApp number is required.",
    };
  }

  // E.164 subscriber numbers are max 15 digits. Enforce international-style entry.
  if (normalized.length < 10 || normalized.length > 15) {
    return {
      ok: false,
      normalized,
      error: "Enter a valid WhatsApp number (10-15 digits, include country code).",
    };
  }

  if (normalized.startsWith("0")) {
    return {
      ok: false,
      normalized,
      error: "Use international format with country code (for example: 2348012345678).",
    };
  }

  return { ok: true, normalized };
}


export function buildOrderMessage({
  productName,
  quantity,
  total,
  storeName,
  orderReference,
  customerName,
}: BuildOrderMessageParams): string {
  const intro = customerName?.trim()
    ? `Hi! My name is ${customerName.trim()}.`
    : "Hi!";

  const ref = orderReference ? ` [Order Ref: ${orderReference}]` : "";

  return `${intro} I want to order: ${productName} x${quantity} - Total: ${formatNaira(total)}. Please confirm my order. [Store: ${storeName}]${ref}`;
}

export function buildWaMeLink(whatsappNumber: string, message: string): string {
  const cleanNumber = normalizeWhatsAppNumber(whatsappNumber);
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
