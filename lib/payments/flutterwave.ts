// lib/payments/flutterwave.ts
//
// Flutterwave doesn't HMAC-sign webhooks — you set a secret hash string in
// your dashboard, and they echo it back verbatim in the verif-hash header.
// Verification is a direct string comparison, not a computed digest.
// Docs: https://developer.flutterwave.com/docs/integration-guides/webhooks

import crypto from "crypto";
import { getRequiredEnv } from "@/lib/env";

export function verifyFlutterwaveSignature(signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secretHash = getRequiredEnv("FLUTTERWAVE_SECRET_HASH");

  const expectedBuf = Buffer.from(secretHash, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Minimal shape of the fields we currently care about — extend as real
// event handling gets built out (see route.ts TODOs).
export interface FlutterwaveWebhookPayload {
  event: string;
  data: {
    id: number | string;
    tx_ref?: string;
    status?: string;
    customer?: { email?: string };
    meta?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// ---- Additions for the checkout flow ----

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

export async function initializeFlutterwaveTransaction(params: {
  email: string;
  amountNaira: number;
  txRef: string;
  redirectUrl: string;
  title: string;
  meta?: Record<string, unknown>;
}): Promise<{ checkoutUrl: string } | { error: string }> {
  const secret = getRequiredEnv("FLUTTERWAVE_SECRET_KEY");

  const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amountNaira,
      currency: "NGN",
      redirect_url: params.redirectUrl,
      customer: { email: params.email },
      meta: params.meta ?? {},
      customizations: { title: params.title },
    }),
  });

  const data = await response.json();

  if (!response.ok || data.status !== "success") {
    return { error: data.message ?? "Could not start Flutterwave checkout." };
  }

  return { checkoutUrl: data.data.link };
}

export async function verifyFlutterwaveTransaction(
  transactionId: string,
): Promise<{ success: boolean; amountNaira: number; txRef: string }> {
  const secret = getRequiredEnv("FLUTTERWAVE_SECRET_KEY");

  const response = await fetch(`${FLUTTERWAVE_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await response.json();

  if (!response.ok || data.status !== "success") {
    return { success: false, amountNaira: 0, txRef: "" };
  }

  return {
    success: data.data.status === "successful",
    amountNaira: data.data.amount,
    txRef: data.data.tx_ref,
  };
}