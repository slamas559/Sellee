import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { createCheckoutSession } from "@/lib/payments/checkout";
import { initializePaystackTransaction } from "@/lib/payments/paystack";
import { initializeFlutterwaveTransaction } from "@/lib/payments/flutterwave";
import { appUrl } from "@/lib/app-url";
import { logDevError } from "@/lib/logger";

const bodySchema = z.object({
  planKey: z.enum(["pro", "business"]),
  billingCycle: z.enum(["monthly", "yearly"]),
  provider: z.enum(["paystack", "flutterwave"]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { planKey, billingCycle, provider } = parsed.data;
  const supabase = createAdminSupabaseClient();

  // Re-check monetization + plan purchasability server-side even though the
  // UI already hides/disables this — a disabled button is a UI courtesy,
  // not a security boundary.
  const [{ data: configRow }, { data: plan }] = await Promise.all([
    supabase.from("app_config").select("value").eq("key", "monetization_enabled").single(),
    supabase.from("plans").select("id, price_monthly, price_yearly, is_purchasable").eq("key", planKey).single(),
  ]);

  const monetizationEnabled = configRow?.value === true || configRow?.value === "true";
  if (!monetizationEnabled || !plan?.is_purchasable) {
    return NextResponse.json({ error: "This plan isn't available for purchase yet." }, { status: 403 });
  }

  const amount = billingCycle === "yearly" ? Number(plan.price_yearly) : Number(plan.price_monthly);

  const sessionResult = await createCheckoutSession({
    vendorId: session.user.id,
    planKey,
    billingCycle,
    provider,
    amount,
  });

  if ("error" in sessionResult) {
    return NextResponse.json({ error: sessionResult.error }, { status: 500 });
  }

  const { txRef } = sessionResult;
  const callbackUrl = appUrl(`/dashboard/plans/callback?tx_ref=${encodeURIComponent(txRef)}&provider=${provider}`);
  const email = session.user.email ?? "";

  if (provider === "paystack") {
    const result = await initializePaystackTransaction({
      email,
      amountNaira: amount,
      txRef,
      callbackUrl,
      metadata: { vendorId: session.user.id, planKey, billingCycle },
    });
    if ("error" in result) {
      logDevError("checkout.subscription.paystack_init", result.error, { txRef });
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ url: result.authorizationUrl });
  }

  const result = await initializeFlutterwaveTransaction({
    email,
    amountNaira: amount,
    txRef,
    redirectUrl: callbackUrl,
    title: `Sellee ${planKey === "pro" ? "Pro" : "Business"} plan`,
    meta: { vendorId: session.user.id, planKey, billingCycle },
  });
  if ("error" in result) {
    logDevError("checkout.subscription.flutterwave_init", result.error, { txRef });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ url: result.checkoutUrl });
}