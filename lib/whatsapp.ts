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
