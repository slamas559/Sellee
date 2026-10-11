import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const patchSchema = z.object({
  monetizationEnabled: z.boolean().optional(),
  planPurchasable: z
    .object({
      planKey: z.enum(["pro", "business"]),
      isPurchasable: z.boolean(),
    })
    .optional(),
  planPricing: z
    .object({
      planKey: z.enum(["free", "pro", "business"]),
      priceMonthly: z.number().int().min(0).max(100_000_000),
      priceYearly: z.number().int().min(0).max(1_000_000_000),
    })
    .strict()
    .optional(),
  planSettings: z
    .object({
      planKey: z.enum(["free", "pro", "business"]),
      limits: z
        .object({
          max_products: z.number().int().min(0).nullable(),
          max_staff: z.number().int().min(0).nullable(),
          broadcast_per_month: z.number().int().min(0).nullable(),
        })
        .strict(),
      features: z
        .object({
          advanced_analytics: z.boolean(),
          exportable_reports: z.boolean(),
          promo_pricing: z.boolean(),
          priority_search_placement: z.boolean(),
          featured_homepage_boost: z.boolean(),
        })
        .strict(),
    })
    .strict()
    .optional(),
}).strict();

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const supabase = createAdminSupabaseClient();

  const [
    { data: configRow, error: configError },
    { data: plans, error: plansError },
    { data: limitRows, error: limitsError },
    { data: featureRows, error: featuresError },
  ] =
    await Promise.all([
      supabase.from("app_config").select("value").eq("key", "monetization_enabled").single(),
      supabase
        .from("plans")
        .select("id, key, name, price_monthly, price_yearly, is_purchasable")
        .order("sort_order"),
      supabase.from("plan_limits").select("plan_id, limit_key, limit_value"),
      supabase.from("plan_features").select("plan_id, feature_key, enabled"),
    ]);

  if (configError || plansError || limitsError || featuresError) {
    logDevError(
      "admin-console.settings.get",
      configError ?? plansError ?? limitsError ?? featuresError,
      {},
    );
    return NextResponse.json({ error: "Could not load settings." }, { status: 500 });
  }

  const monetizationEnabled = configRow?.value === true || configRow?.value === "true";
  const plansWithSettings = (plans ?? []).map((plan) => {
    const limits: Record<string, number | null> = {
      max_products: null,
      max_staff: null,
      broadcast_per_month: null,
    };
    const features: Record<string, boolean> = {
      advanced_analytics: false,
      exportable_reports: false,
      promo_pricing: false,
      priority_search_placement: false,
      featured_homepage_boost: false,
    };

    for (const row of limitRows ?? []) {
      if (row.plan_id === plan.id && row.limit_key in limits) {
        limits[row.limit_key] = row.limit_value;
      }
    }
    for (const row of featureRows ?? []) {
      if (row.plan_id === plan.id && row.feature_key in features) {
        features[row.feature_key] = row.enabled;
      }
    }

    return { ...plan, limits, features };
  });

  return NextResponse.json({
    monetizationEnabled,
    plans: plansWithSettings,
  });
}

export async function PATCH(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (
    parsed.data.monetizationEnabled === undefined &&
    !parsed.data.planPurchasable &&
    !parsed.data.planPricing &&
    !parsed.data.planSettings
  ) {
    return NextResponse.json({ error: "Nothing valid to update." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  if (parsed.data.monetizationEnabled !== undefined) {
    const { error } = await supabase
      .from("app_config")
      .update({ value: parsed.data.monetizationEnabled })
      .eq("key", "monetization_enabled");

    if (error) {
      logDevError("admin-console.settings.monetization_enabled", error, {});
      return NextResponse.json({ error: "Could not update monetization switch." }, { status: 500 });
    }

    await writeAuditLog({
      adminId: session.user.id,
      action: parsed.data.monetizationEnabled
        ? "settings.monetization_enabled"
        : "settings.monetization_disabled",
      targetType: "app_config",
      targetId: "monetization_enabled",
      metadata: { value: parsed.data.monetizationEnabled },
    });
  }

  if (parsed.data.planPurchasable) {
    const { planKey, isPurchasable } = parsed.data.planPurchasable;
    const { error } = await supabase
      .from("plans")
      .update({ is_purchasable: isPurchasable })
      .eq("key", planKey);

    if (error) {
      logDevError("admin-console.settings.plan_purchasable", error, { planKey });
      return NextResponse.json({ error: `Could not update ${planKey} plan.` }, { status: 500 });
    }

    if (parsed.data.planPricing) {
      const { planKey, priceMonthly, priceYearly } = parsed.data.planPricing;
      const { error } = await supabase
        .from("plans")
        .update({ price_monthly: priceMonthly, price_yearly: priceYearly })
        .eq("key", planKey);

      if (error) {
        logDevError("admin-console.settings.plan_pricing", error, { planKey });
        return NextResponse.json({ error: `Could not update ${planKey} plan prices.` }, { status: 500 });
      }

      await writeAuditLog({
        adminId: session.user.id,
        action: "settings.plan_pricing_updated",
        targetType: "plan",
        targetId: planKey,
        metadata: { priceMonthly, priceYearly },
      });
    }

    await writeAuditLog({
      adminId: session.user.id,
      action: isPurchasable ? "settings.plan_enabled" : "settings.plan_disabled",
      targetType: "plan",
      targetId: planKey,
      metadata: { isPurchasable },
    });
  }

  if (parsed.data.planSettings) {
    const { planKey, limits, features } = parsed.data.planSettings;
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("key", planKey)
      .single();

    if (planError || !plan) {
      logDevError("admin-console.settings.plan_settings.lookup", planError, { planKey });
      return NextResponse.json({ error: `Could not load ${planKey} plan.` }, { status: 500 });
    }

    const { error: limitsError } = await supabase.from("plan_limits").upsert(
      Object.entries(limits).map(([limit_key, limit_value]) => ({
        plan_id: plan.id,
        limit_key,
        limit_value,
      })),
      { onConflict: "plan_id,limit_key" },
    );

    if (limitsError) {
      logDevError("admin-console.settings.plan_limits", limitsError, { planKey });
      return NextResponse.json({ error: `Could not update ${planKey} plan limits.` }, { status: 500 });
    }

    const { error: featuresError } = await supabase.from("plan_features").upsert(
      Object.entries(features).map(([feature_key, enabled]) => ({
        plan_id: plan.id,
        feature_key,
        enabled,
      })),
      { onConflict: "plan_id,feature_key" },
    );

    if (featuresError) {
      logDevError("admin-console.settings.plan_features", featuresError, { planKey });
      return NextResponse.json(
        { error: `Plan limits were saved, but could not update ${planKey} features.` },
        { status: 500 },
      );
    }

    await writeAuditLog({
      adminId: session.user.id,
      action: "settings.plan_settings_updated",
      targetType: "plan",
      targetId: planKey,
      metadata: { limits, features },
    });
  }

  return NextResponse.json({ ok: true });
}