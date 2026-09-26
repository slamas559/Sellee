import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { requireVerifiedPhone } from "@/lib/require-verified-phone";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { executeBroadcastNow, scheduleBroadcast } from "@/lib/whatsapp-bot/broadcasts";
import { getMonthlyBroadcastUsage } from "@/lib/broadcasts/quota";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";

const targetScopeSchema = z.enum(["followers", "customers", "all"]);

const createBroadcastSchema = z
  .object({
    mode: z.enum(["now", "schedule"]),
    message: z.string().trim().min(3).max(1000),
    target_scope: targetScopeSchema.default("followers"),
    scheduled_at: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode !== "schedule") {
      return;
    }

    if (!value.scheduled_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scheduled_at is required for scheduled broadcasts.",
        path: ["scheduled_at"],
      });
      return;
    }

    const parsed = new Date(value.scheduled_at);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid scheduled_at date.",
        path: ["scheduled_at"],
      });
      return;
    }

    if (parsed.getTime() <= Date.now() + 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled time must be at least 1 minute in the future.",
        path: ["scheduled_at"],
      });
    }
  });

export async function GET() {
  const ctx = await requireVendorWorkspaceApi("broadcasts");
  if (ctx instanceof NextResponse) return ctx;
  const { vendorId } = ctx;

  // Checks the STORE'S WhatsApp number, not the logged-in user's own phone -
  // vendorId is always the store owner here, vendor session or staff.
  const guard = await requireVerifiedPhone({
    userId: vendorId,
    context: "vendor_whatsapp",
    requiredRole: "vendor",
  });
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("vendor_id", vendorId)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Create your store first before sending broadcasts." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("whatsapp_broadcasts")
      .select("id, status, message, target_scope, scheduled_at, sent_at, sent_count, failed_count, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      logDevError("vendor.broadcasts.list", error, { vendorId, storeId: store.id });
      return NextResponse.json({ error: "Could not load broadcast history." }, { status: 500 });
    }

    return NextResponse.json({
      broadcasts: (data ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        message: row.message,
        target_scope: row.target_scope,
        scheduled_at: row.scheduled_at,
        sent_at: row.sent_at,
        sent_count: row.sent_count ?? 0,
        failed_count: row.failed_count ?? 0,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    logDevError("vendor.broadcasts.list.unhandled", error, { vendorId });
    return NextResponse.json({ error: "Unexpected broadcasts listing error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireVendorWorkspaceApi("broadcasts");
  if (ctx instanceof NextResponse) return ctx;
  const { vendorId } = ctx;

  const guard = await requireVerifiedPhone({
    userId: vendorId,
    context: "vendor_whatsapp",
    requiredRole: "vendor",
  });
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const payload = createBroadcastSchema.parse(await request.json());
    const supabase = createAdminSupabaseClient();

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("vendor_id", vendorId)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Create your store first before sending broadcasts." },
        { status: 400 },
      );
    }

    // Scheduling predates the quota system this route now shares with
    // /api/vendor/broadcasts/send-now - without this check, scheduling
    // would be a way to send unlimited broadcasts around the monthly limit.
    // Quota is always tracked against the vendor, not which staff member
    // sent it - one shared monthly allowance per store.
    const quota = await getMonthlyBroadcastUsage(vendorId);
    if (quota.remaining <= 0) {
      const message =
        quota.limit === 0
          ? "Broadcasts aren't included on your current plan. Upgrade to Pro or Business to send broadcasts."
          : `You've used all ${quota.limit} of your broadcasts this month. Quota resets next month.`;
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (payload.mode === "now") {
      const result = await executeBroadcastNow({
        vendorId,
        storeId: store.id,
        message: payload.message,
        targetScope: payload.target_scope,
      });

      return NextResponse.json({
        mode: "now",
        result,
      });
    }

    const scheduledAtIso = new Date(payload.scheduled_at as string).toISOString();
    const result = await scheduleBroadcast({
      vendorId,
      storeId: store.id,
      message: payload.message,
      targetScope: payload.target_scope,
      scheduledAt: scheduledAtIso,
    });

    return NextResponse.json({
      mode: "schedule",
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invalid broadcast payload.",
        },
        { status: 400 },
      );
    }

    logDevError("vendor.broadcasts.create.unhandled", error, { vendorId });
    return NextResponse.json({ error: "Unexpected broadcast create error." }, { status: 500 });
  }
}