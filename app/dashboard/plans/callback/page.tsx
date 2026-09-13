import Link from "next/link";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";
import { verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";
import { activateSubscriptionFromSession } from "@/lib/payments/checkout";

// Both providers redirect the browser here after checkout, before their
// webhook necessarily arrives. This page does its own verify-and-activate
// call so the vendor doesn't sit staring at "Coming soon" for a few seconds
// waiting on the webhook — activateSubscriptionFromSession() is idempotent,
// so whichever of this page or the webhook gets there first does the work
// and the other is a no-op.
export default async function PlansCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tx_ref?: string; provider?: string; transaction_id?: string }>;
}) {
  const { tx_ref: txRef, provider, transaction_id: transactionId } = await searchParams;

  let outcome: "success" | "failed" | "unknown" = "unknown";

  if (provider === "paystack" && txRef) {
    const verification = await verifyPaystackTransaction(txRef);
    if (verification.success) {
      const result = await activateSubscriptionFromSession(txRef, txRef);
      outcome = "ok" in result ? "success" : "failed";
    } else {
      outcome = "failed";
    }
  } else if (provider === "flutterwave" && transactionId) {
    const verification = await verifyFlutterwaveTransaction(transactionId);
    if (verification.success) {
      const result = await activateSubscriptionFromSession(verification.txRef || txRef || "", transactionId);
      outcome = "ok" in result ? "success" : "failed";
    } else {
      outcome = "failed";
    }
  }

  const copy = {
    success: {
      title: "You're upgraded",
      body: "Your plan is active. It may take a moment to reflect everywhere in your dashboard.",
    },
    failed: {
      title: "Payment didn't go through",
      body: "No charge was completed, or we couldn't confirm it. You haven't been billed — try again, or reach out if this keeps happening.",
    },
    unknown: {
      title: "We're checking your payment",
      body: "This can take a minute to confirm. Check your plan status on the plans page shortly.",
    },
  }[outcome];

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
      <h1 className="font-display text-xl font-bold text-slate-900">{copy.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
      <Link
        href="/dashboard/plans"
        className="mt-5 inline-block rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Back to plans
      </Link>
    </section>
  );
}