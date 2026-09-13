// lib/payments/paystack.ts
//
// Paystack signs webhook bodies with HMAC-SHA512 of the raw request body,
// using your secret key, sent in the x-paystack-signature header.
// Docs: https://paystack.com/docs/payments/webhooks/#verify-event-origin

import crypto from "crypto";
import { getRequiredEnv } from "@/lib/env";

export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = getRequiredEnv("PAYSTACK_SECRET_KEY");
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

  // timingSafeEqual requires equal-length buffers; mismatched length is
  // itself a mismatch (Buffer.from on unequal-length hex still throws inside
  // timingSafeEqual, so length-check first).
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Minimal shape of the fields we currently care about — extend as real
// event handling gets built out (see route.ts TODOs).
export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number | string;
    reference?: string;
    status?: string;
    customer?: { email?: string };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// ---- Additions for the checkout flow ----

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export async function initializePaystackTransaction(params: {
  email: string;
  amountNaira: number;
  txRef: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const secret = getRequiredEnv("PAYSTACK_SECRET_KEY");

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // Paystack expects kobo
      reference: params.txRef,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    return { error: data.message ?? "Could not start Paystack checkout." };
  }

  return { authorizationUrl: data.data.authorization_url };
}

export async function verifyPaystackTransaction(
  reference: string,
): Promise<{ success: boolean; amountNaira: number }> {
  const secret = getRequiredEnv("PAYSTACK_SECRET_KEY");

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    return { success: false, amountNaira: 0 };
  }

  return {
    success: data.data.status === "success",
    amountNaira: data.data.amount / 100,
  };
}