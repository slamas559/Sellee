import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { requireVerifiedPhone } from "@/lib/require-verified-phone";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { executeBroadcastWithFallback } from "@/lib/broadcasts/execute-with-fallback";
import { getMonthlyBroadcastUsage } from "@/lib/broadcasts/quota";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";

const sendNowSchema = z
  .object({
    message: z.string().trim().min(3).max(1000),
    email_subject: z.string().trim().max(200).optional(),
    target_scope: z.enum(["followers", "customers", "all"]).default("followers"),
    channels: z.array(z.enum(["whatsapp", "email"])).min(1, "Pick at least one channel."),
  })
  .superRefine((value, ctx) => {
    if (value.channels.includes("email") && !value.email_subject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An email subject is required when sending by email.",
        path: ["email_subject"],
      });
    }
  });

export async function POST(request: Request) {
  const ctx = await requireVendorWorkspaceApi("broadcasts");
  if (ctx instanceof NextResponse) return ctx;
  const { vendorId } = ctx;

  let payload: z.infer<typeof sendNowSchema>;
  try {
    payload = sendNowSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid broadcast payload." }, { status: 400 });
    }
    throw error;
  }

  // Only WhatsApp requires the vendor's own number to be verified - email
  // sending doesn't touch the vendor's phone at all, so this guard is
  // scoped to when it's actually relevant rather than blocking every send.
  if (payload.channels.includes("whatsapp")) {
    const guard = await requireVerifiedPhone({
      userId: vendorId,
      context: "vendor_whatsapp",
      requiredRole: "vendor",
    });
    if (!guard.ok) {
      return guard.response;
    }
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name")
      .eq("vendor_id", vendorId)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ error: "Create your store first before sending broadcasts." }, { status: 400 });
    }

    const quota = await getMonthlyBroadcastUsage(vendorId);
    if (quota.remaining <= 0) {
      const message =
        quota.limit === 0
          ? "Broadcasts aren't included on your current plan. Upgrade to Pro or Business to send broadcasts."
          : `You've used all ${quota.limit} of your broadcasts this month. Quota resets next month.`;
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const result = await executeBroadcastWithFallback({
      vendorId,
      storeId: store.id,
      targetScope: payload.target_scope,
      channels: payload.channels,
      whatsappMessage: payload.message,
      emailSubject: payload.email_subject,
      emailBody: payload.message,
    });

    return NextResponse.json({ result, quota: await getMonthlyBroadcastUsage(vendorId) });
  } catch (error) {
    logDevError("vendor.broadcasts.send_now.unhandled", error, { vendorId });
    return NextResponse.json({ error: "Unexpected error sending broadcast." }, { status: 500 });
  }
}