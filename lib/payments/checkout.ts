// lib/payments/checkout.ts
//
// Provider-agnostic pieces of the checkout flow: creating a pending
// checkout_sessions row, and activating a vendor's subscription once a
// provider confirms payment (called from both the webhook route AND the
// callback page's synchronous verify — whichever arrives first wins, the
// second is a no-op because the session is already 'completed').

import { randomUUID } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError, logServerInfo } from "@/lib/logger";

export type BillingCycle = "monthly" | "yearly";
export type PaymentProvider = "paystack" | "flutterwave";

export interface CheckoutSession {
  id: string;
  txRef: string;
  vendorId: string;
  planKey: "pro" | "business";
  billingCycle: BillingCycle;
  provider: PaymentProvider;
  amount: number;
  status: "pending" | "completed" | "failed";
}

// tx_ref needs to be unique and reasonably unguessable, and both providers
// just want an opaque string - prefixing with the provider makes it easy to
// eyeball which flow a given reference belongs to in logs/dashboards.
export function generateTxRef(provider: PaymentProvider): string {
  return `sellee-${provider}-${randomUUID()}`;
}

export async function createCheckoutSession(params: {
  vendorId: string;
  planKey: "pro" | "business";
  billingCycle: BillingCycle;
  provider: PaymentProvider;
  amount: number;
}): Promise<{ txRef: string } | { error: string }> {
  const supabase = createAdminSupabaseClient();
  const txRef = generateTxRef(params.provider);

  const { error } = await supabase.from("checkout_sessions").insert({
    tx_ref: txRef,
    vendor_id: params.vendorId,
    plan_key: params.planKey,
    billing_cycle: params.billingCycle,
    provider: params.provider,
    amount: params.amount,
  });

  if (error) {
    logDevError("payments.checkout.create_session", error, params);
    return { error: "Could not start checkout." };
  }

  return { txRef };
}

async function getSessionByTxRef(txRef: string): Promise<CheckoutSession | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("id, tx_ref, vendor_id, plan_key, billing_cycle, provider, amount, status")
    .eq("tx_ref", txRef)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    txRef: data.tx_ref,
    vendorId: data.vendor_id,
    planKey: data.plan_key,
    billingCycle: data.billing_cycle,
    provider: data.provider,
    amount: Number(data.amount),
    status: data.status,
  };
}

// Called once a provider confirms a charge actually succeeded (i.e. after
// verifyPaystackTransaction / verifyFlutterwaveTransaction returned success -
// this function does NOT itself trust its caller, only that the caller
// already checked). Idempotent: if the session is already 'completed', this
// is a no-op, so it's safe to call from both the webhook and the callback
// page's fast-path verify without double-activating.
export async function activateSubscriptionFromSession(
  txRef: string,
  providerReference: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSessionByTxRef(txRef);
  if (!session) {
    logServerInfo("payments.checkout.activate.session_not_found", { txRef });
    return { error: "Unknown checkout session." };
  }

  if (session.status === "completed") {
    return { ok: true }; // already activated by the other channel (webhook or callback)
  }

  const supabase = createAdminSupabaseClient();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, price_monthly")
    .eq("key", session.planKey)
    .single();

  if (planError || !plan) {
    logDevError("payments.checkout.activate.plan_lookup", planError, { txRef });
    return { error: "Could not find plan." };
  }

  const periodMs = session.billingCycle === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const currentPeriodEnd = new Date(Date.now() + periodMs).toISOString();

  // Locked price is always stored as a monthly figure for easy comparison
  // against the plan's current price_monthly later, regardless of whether
  // this particular charge was a monthly or yearly one.
  const lockedMonthlyPrice = session.billingCycle === "yearly" ? session.amount / 12 : session.amount;

  const { error: upsertError } = await supabase.from("vendor_subscriptions").upsert(
    {
      vendor_id: session.vendorId,
      plan_id: plan.id,
      status: "active",
      billing_cycle: session.billingCycle,
      payment_provider: session.provider,
      provider_subscription_id: providerReference,
      locked_monthly_price: lockedMonthlyPrice,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vendor_id" },
  );

  if (upsertError) {
    logDevError("payments.checkout.activate.upsert", upsertError, { txRef });
    return { error: "Could not activate subscription." };
  }

  await supabase.from("checkout_sessions").update({ status: "completed" }).eq("id", session.id);

  logServerInfo("payments.checkout.activated", {
    vendorId: session.vendorId,
    planKey: session.planKey,
    provider: session.provider,
  });

  return { ok: true };
}

export async function markSessionFailed(txRef: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  await supabase.from("checkout_sessions").update({ status: "failed" }).eq("tx_ref", txRef);
}