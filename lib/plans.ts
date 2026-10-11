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
import { logDevError } from "@/lib/logger";
import { FEATURE_LABELS, LIMIT_LABELS } from "@/lib/plan-labels";
export { FEATURE_LABELS, LIMIT_LABELS } from "@/lib/plan-labels";

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

  const [
    { data: limitRows, error: limitError },
    { data: featureRows, error: featureError },
  ] = await Promise.all([
    supabase
      .from("plan_limits")
      .select("limit_key, limit_value")
      .eq("plan_id", sub.plan_id),
    supabase
      .from("plan_features")
      .select("feature_key, enabled")
      .eq("plan_id", sub.plan_id),
  ]);

  if (limitError) {
    logDevError("plans.vendor_plan.limits", limitError, { vendorId, planId: sub.plan_id });
    throw new Error("Could not load vendor plan limits.");
  }
  if (featureError) {
    logDevError("plans.vendor_plan.features", featureError, { vendorId, planId: sub.plan_id });
    throw new Error("Could not load vendor plan features.");
  }

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
  // @ts-expect-error - nested relation typing depends on generated Supabase types
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

// While monetization is off, every vendor gets full access regardless of
// plan - that's the whole point of the admin toggle ("everything free while
// we're starting out"). Both gating helpers below check this first so no
// caller has to remember to check it separately.
export async function hasFeature(vendorId: string, featureKey: string): Promise<boolean> {
  if (!(await isMonetizationEnabled())) return true;

  const plan = await getVendorPlan(vendorId);
  if (!plan) return false; // fail closed on unexpected missing plan
  return plan.features[featureKey] === true;
}

// currentCount = how many of the resource the vendor already has/used.
// Returns true if they're still within their plan's limit (or it's unlimited,
// or monetization is off entirely).
export async function withinLimit(
  vendorId: string,
  limitKey: string,
  currentCount: number
): Promise<boolean> {
  if (!(await isMonetizationEnabled())) return true;

  const plan = await getVendorPlan(vendorId);
  if (!plan) return false;

  const limit = plan.limits[limitKey];
  if (limit === null) return true;
  if (limit === undefined) return false;

  return currentCount < limit;
}

export async function canUseStaffAccounts(vendorId: string): Promise<boolean> {
  return withinLimit(vendorId, "max_staff", 0);
}

export async function getVendorFeatureAccess(
  vendorIds: string[],
  featureKeys: string[],
): Promise<Record<string, Set<string>>> {
  const uniqueVendorIds = [...new Set(vendorIds)];
  const access = Object.fromEntries(featureKeys.map((key) => [key, new Set<string>()]));
  if (uniqueVendorIds.length === 0 || featureKeys.length === 0) return access;

  if (!(await isMonetizationEnabled())) {
    for (const vendorId of uniqueVendorIds) {
      for (const featureKey of featureKeys) access[featureKey].add(vendorId);
    }
    return access;
  }

  const supabase = createAdminSupabaseClient();
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("vendor_subscriptions")
    .select("vendor_id, plan_id")
    .in("vendor_id", uniqueVendorIds);

  if (subscriptionError) {
    logDevError("plans.feature_access.subscriptions", subscriptionError);
    throw new Error("Could not load vendor plan access.");
  }

  const planIds = [...new Set((subscriptions ?? []).map((row) => row.plan_id))];
  if (planIds.length === 0) return access;

  const { data: featureRows, error: featureError } = await supabase
    .from("plan_features")
    .select("plan_id, feature_key, enabled")
    .in("plan_id", planIds)
    .in("feature_key", featureKeys);

  if (featureError) {
    logDevError("plans.feature_access.features", featureError);
    throw new Error("Could not load plan feature access.");
  }

  const enabledByPlanAndFeature = new Set(
    (featureRows ?? [])
      .filter((row) => row.enabled === true)
      .map((row) => `${row.plan_id}:${row.feature_key}`),
  );

  for (const subscription of subscriptions ?? []) {
    for (const featureKey of featureKeys) {
      if (enabledByPlanAndFeature.has(`${subscription.plan_id}:${featureKey}`)) {
        access[featureKey].add(subscription.vendor_id);
      }
    }
  }

  return access;
}

export async function isMonetizationEnabled(): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "monetization_enabled")
    .single();

  if (error) {
    logDevError("plans.monetization_config", error);
    throw new Error("Could not load monetization settings.");
  }

  return data?.value === true || data?.value === "true";
}

export async function canUseAllStoreTemplates(vendorId: string): Promise<boolean> {
  if (!(await isMonetizationEnabled())) return true;

  const plan = await getVendorPlan(vendorId);
  return plan?.planKey === "pro" || plan?.planKey === "business";
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