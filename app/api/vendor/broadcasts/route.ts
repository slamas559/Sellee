import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { requireVerifiedPhone } from "@/lib/require-verified-phone";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { executeBroadcastNow, scheduleBroadcast } from "@/lib/whatsapp-bot/broadcasts";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const guard = await requireVerifiedPhone({
    userId: session.user.id,
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
      .eq("vendor_id", session.user.id)
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
      logDevError("vendor.broadcasts.list", error, { userId: session.user.id, storeId: store.id });
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
    logDevError("vendor.broadcasts.list.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected broadcasts listing error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const guard = await requireVerifiedPhone({
    userId: session.user.id,
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
      .eq("vendor_id", session.user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Create your store first before sending broadcasts." },
        { status: 400 },
      );
    }

    if (payload.mode === "now") {
      const result = await executeBroadcastNow({
        vendorId: session.user.id,
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
      vendorId: session.user.id,
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

    logDevError("vendor.broadcasts.create.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected broadcast create error." }, { status: 500 });
  }
}
