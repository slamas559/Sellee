import { NextResponse } from "next/server";
import { logDevError, logServerInfo } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { verifyPaystackSignature, verifyPaystackTransaction, type PaystackWebhookPayload } from "@/lib/payments/paystack";
import { activateSubscriptionFromSession, markSessionFailed } from "@/lib/payments/checkout";

// Paystack requires a 200 response quickly, or it'll retry with backoff —
// so this route does the minimum synchronously and returns fast.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    logServerInfo("payments.paystack.webhook.invalid_signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logDevError("payments.paystack.webhook.parse", error);
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Upsert-and-ignore-conflict for idempotency: Paystack retries on timeout,
  // and the unique (provider, provider_event_id) constraint means a retried
  // delivery is a no-op rather than double-processing a payment.
  const { error } = await supabase.from("payment_events").upsert(
    {
      provider: "paystack",
      provider_event_id: String(payload.data.id),
      event_type: payload.event,
      payload,
    },
    { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
  );

  if (error) {
    logDevError("payments.paystack.webhook.store", error, { event: payload.event });
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  logServerInfo("payments.paystack.webhook.received", { event: payload.event });

  if (payload.event === "charge.success") {
    const reference = String(payload.data.reference ?? "");
    // Re-verify against Paystack's API rather than trusting the webhook body
    // directly — the signature check above proves the request came from
    // Paystack, but a verify call is the documented way to get the
    // authoritative status/amount for a given reference.
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.success) {
      await markSessionFailed(reference);
      logServerInfo("payments.paystack.webhook.verify_failed", { reference });
      return NextResponse.json({ ok: true }); // still 200 — nothing to retry
    }

    const result = await activateSubscriptionFromSession(reference, reference);
    if ("error" in result) {
      logDevError("payments.paystack.webhook.activate", result.error, { reference });
      // 500 here IS worth a Paystack retry, unlike the cases above.
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}