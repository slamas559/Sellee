import { NextResponse } from "next/server";
import { logDevError, logServerInfo } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { verifyFlutterwaveSignature, verifyFlutterwaveTransaction, type FlutterwaveWebhookPayload } from "@/lib/payments/flutterwave";
import { activateSubscriptionFromSession, markSessionFailed } from "@/lib/payments/checkout";

// Same shape as the Paystack route: verify, dedupe, store, then activate.
export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");

  if (!verifyFlutterwaveSignature(signature)) {
    logServerInfo("payments.flutterwave.webhook.invalid_signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: FlutterwaveWebhookPayload;
  try {
    payload = await request.json();
  } catch (error) {
    logDevError("payments.flutterwave.webhook.parse", error);
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { error } = await supabase.from("payment_events").upsert(
    {
      provider: "flutterwave",
      provider_event_id: String(payload.data.id),
      event_type: payload.event,
      payload,
    },
    { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
  );

  if (error) {
    logDevError("payments.flutterwave.webhook.store", error, { event: payload.event });
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  logServerInfo("payments.flutterwave.webhook.received", { event: payload.event });

  if (payload.event === "charge.completed") {
    const transactionId = String(payload.data.id ?? "");
    const txRef = String(payload.data.tx_ref ?? "");

    // Re-verify against Flutterwave's API (by transaction id, not tx_ref)
    // for the authoritative status — same reasoning as the Paystack route.
    const verification = await verifyFlutterwaveTransaction(transactionId);

    if (!verification.success) {
      await markSessionFailed(txRef);
      logServerInfo("payments.flutterwave.webhook.verify_failed", { txRef });
      return NextResponse.json({ ok: true });
    }

    const result = await activateSubscriptionFromSession(verification.txRef || txRef, transactionId);
    if ("error" in result) {
      logDevError("payments.flutterwave.webhook.activate", result.error, { txRef });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}