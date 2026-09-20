import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { requireVerifiedPhone } from "@/lib/require-verified-phone";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { executeBroadcastWithFallback } from "@/lib/broadcasts/execute-with-fallback";
import { getMonthlyBroadcastUsage } from "@/lib/broadcasts/quota";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      userId: session.user.id,
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
      .eq("vendor_id", session.user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ error: "Create your store first before sending broadcasts." }, { status: 400 });
    }

    const quota = await getMonthlyBroadcastUsage(session.user.id);
    if (quota.remaining <= 0) {
      return NextResponse.json(
        { error: `You've used all ${quota.limit} of your broadcasts this month. Quota resets next month.` },
        { status: 403 },
      );
    }

    const result = await executeBroadcastWithFallback({
      vendorId: session.user.id,
      storeId: store.id,
      targetScope: payload.target_scope,
      channels: payload.channels,
      whatsappMessage: payload.message,
      emailSubject: payload.email_subject,
      emailBody: payload.message,
    });

    return NextResponse.json({ result, quota: await getMonthlyBroadcastUsage(session.user.id) });
  } catch (error) {
    logDevError("vendor.broadcasts.send_now.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected error sending broadcast." }, { status: 500 });
  }
}