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
});

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const supabase = createAdminSupabaseClient();

  const [{ data: configRow, error: configError }, { data: plans, error: plansError }] =
    await Promise.all([
      supabase.from("app_config").select("value").eq("key", "monetization_enabled").single(),
      supabase
        .from("plans")
        .select("id, key, name, price_monthly, is_purchasable")
        .order("sort_order"),
    ]);

  if (configError || plansError) {
    logDevError("admin-console.settings.get", configError ?? plansError, {});
    return NextResponse.json({ error: "Could not load settings." }, { status: 500 });
  }

  const monetizationEnabled = configRow?.value === true || configRow?.value === "true";

  return NextResponse.json({
    monetizationEnabled,
    plans: plans ?? [],
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
  if (parsed.data.monetizationEnabled === undefined && !parsed.data.planPurchasable) {
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

    await writeAuditLog({
      adminId: session.user.id,
      action: isPurchasable ? "settings.plan_enabled" : "settings.plan_disabled",
      targetType: "plan",
      targetId: planKey,
      metadata: { isPurchasable },
    });
  }

  return NextResponse.json({ ok: true });
}