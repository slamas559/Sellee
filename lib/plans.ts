// lib/plans.ts
//
// Server-side feature-gating helpers for the vendor pricing plan system.
// Follows the same pattern as lib/vendor-insights.ts and lib/dashboard-data.ts:
// uses createAdminSupabaseClient() (service-role key), since Sellee's auth is
// NextAuth (Credentials + Google), not Supabase Auth — RLS/auth.uid() doesn't
// apply here, so vendorId must come from the NextAuth session (public.users.id
// for a row with role = 'vendor'), passed in explicitly by the caller.
//
// These are safe to call everywhere right now: every vendor is backfilled onto
// the Free plan, and Free's limits/features are set intentionally in the seed
// data, so nothing will actually block anyone until monetization_enabled flips.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export type VendorPlan = {
  planId: string;
  planKey: "free" | "pro" | "business";
  planName: string;
  status: string;
  limits: Record<string, number | null>; // null = unlimited
  features: Record<string, boolean>;
};

export async function getVendorPlan(vendorId: string): Promise<VendorPlan | null> {
  const supabase = createAdminSupabaseClient();

  const { data: sub, error: subError } = await supabase
    .from("vendor_subscriptions")
    .select("plan_id, status, plans(key, name)")
    .eq("vendor_id", vendorId)
    .single();

  if (subError || !sub) {
    // No subscription row found — shouldn't happen post-backfill for an
    // existing vendor, but fail safe rather than throw.
    console.error(`No vendor_subscriptions row for vendor ${vendorId}`, subError);
    return null;
  }

  const [{ data: limitRows }, { data: featureRows }] = await Promise.all([
    supabase
      .from("plan_limits")
      .select("limit_key, limit_value")
      .eq("plan_id", sub.plan_id),
    supabase
      .from("plan_features")
      .select("feature_key, enabled")
      .eq("plan_id", sub.plan_id),
  ]);

  const limits: Record<string, number | null> = {};
  for (const row of limitRows ?? []) {
    limits[row.limit_key] = row.limit_value;
  }

  const features: Record<string, boolean> = {};
  for (const row of featureRows ?? []) {
    features[row.feature_key] = row.enabled;
  }

  // @ts-expect-error - nested relation typing depends on your generated Supabase types
  const planKey = sub.plans?.key ?? "free";
  // @ts-expect-error
  const planName = sub.plans?.name ?? "Free";

  return {
    planId: sub.plan_id,
    planKey,
    planName,
    status: sub.status,
    limits,
    features,
  };
}

export async function hasFeature(vendorId: string, featureKey: string): Promise<boolean> {
  const plan = await getVendorPlan(vendorId);
  if (!plan) return false; // fail closed on unexpected missing plan
  return plan.features[featureKey] === true;
}

// currentCount = how many of the resource the vendor already has/used.
// Returns true if they're still within their plan's limit (or it's unlimited).
export async function withinLimit(
  vendorId: string,
  limitKey: string,
  currentCount: number
): Promise<boolean> {
  const plan = await getVendorPlan(vendorId);
  if (!plan) return false;

  const limit = plan.limits[limitKey];
  if (limit === null || limit === undefined) return true; // unlimited or undefined = no restriction

  return currentCount < limit;
}

export async function isMonetizationEnabled(): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "monetization_enabled")
    .single();

  return data?.value === true || data?.value === "true";
}

// ---- Additions for the /dashboard/plans pricing page ----

export type PlanWithDetails = {
  id: string;
  key: "free" | "pro" | "business";
  name: string;
  priceMonthly: number;
  priceYearly: number;
  isPurchasable: boolean;
  limits: Record<string, number | null>;
  features: Record<string, boolean>;
};

export type PricingPageData = {
  plans: PlanWithDetails[];
  currentPlanKey: string;
  monetizationEnabled: boolean;
};

// Human-readable copy for each limit/feature key, in display order.
// Keeping this centralized means adding a new feature later is a one-line
// change here rather than editing markup in three places.
export const LIMIT_LABELS: Record<string, (value: number | null) => string> = {
  max_products: (v) => (v === null ? "Unlimited products" : `Up to ${v} products`),
  max_staff: (v) => (v === null ? "Unlimited staff accounts" : `${v} staff account${v === 1 ? "" : "s"}`),
  broadcast_per_month: (v) =>
    v === null ? "Unlimited WhatsApp broadcasts" : v === 0 ? "No WhatsApp broadcasts" : `${v} WhatsApp broadcasts/month`,
};

export const FEATURE_LABELS: Record<string, string> = {
  advanced_analytics: "Advanced analytics (AOV, repeat rate, fulfillment time)",
  exportable_reports: "Exportable analytics reports",
  promo_pricing: "Promo / compare-at pricing",
  priority_search_placement: "Priority placement in marketplace search",
  featured_homepage_boost: "Featured homepage boost",
};

export async function getPricingPageData(vendorId: string | undefined): Promise<PricingPageData> {
  const supabase = createAdminSupabaseClient();

  const [{ data: planRows }, { data: limitRows }, { data: featureRows }, { data: configRow }] =
    await Promise.all([
      supabase.from("plans").select("id, key, name, price_monthly, price_yearly, is_purchasable, sort_order").order("sort_order"),
      supabase.from("plan_limits").select("plan_id, limit_key, limit_value"),
      supabase.from("plan_features").select("plan_id, feature_key, enabled"),
      supabase.from("app_config").select("value").eq("key", "monetization_enabled").single(),
    ]);

  const plans: PlanWithDetails[] = (planRows ?? []).map((plan) => {
    const limits: Record<string, number | null> = {};
    for (const row of limitRows ?? []) {
      if (row.plan_id === plan.id) limits[row.limit_key] = row.limit_value;
    }
    const features: Record<string, boolean> = {};
    for (const row of featureRows ?? []) {
      if (row.plan_id === plan.id) features[row.feature_key] = row.enabled;
    }
    return {
      id: plan.id,
      key: plan.key,
      name: plan.name,
      priceMonthly: Number(plan.price_monthly),
      priceYearly: Number(plan.price_yearly),
      isPurchasable: plan.is_purchasable,
      limits,
      features,
    };
  });

  let currentPlanKey = "free";
  if (vendorId) {
    const plan = await getVendorPlan(vendorId);
    if (plan) currentPlanKey = plan.planKey;
  }

  const monetizationEnabled = configRow?.value === true || configRow?.value === "true";

  return { plans, currentPlanKey, monetizationEnabled };
}