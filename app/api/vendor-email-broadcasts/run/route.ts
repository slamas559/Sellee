import { NextResponse } from "next/server";
import { logDevError } from "@/lib/logger";
import { processVendorEmailBroadcastBatch } from "@/lib/broadcasts/send-email-broadcast";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// Same reasoning as /api/email-broadcasts/run: bounds TOTAL recipients
// processed this run across all broadcasts, not per-broadcast.
const MAX_RECIPIENTS_PER_RUN = 100;

export const maxDuration = 60;

// Same dual-mode auth as the other /run endpoints: external scheduler with
// a bearer secret, or Vercel's own cron header when explicitly opted in.
function isAuthorized(request: Request): boolean {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const allowVercelCron = process.env.VENDOR_EMAIL_BROADCAST_ALLOW_VERCEL_CRON === "true";

  if (allowVercelCron && Boolean(vercelCronHeader)) {
    return true;
  }

  const configuredSecret = process.env.VENDOR_EMAIL_BROADCAST_CRON_SECRET;

  if (!configuredSecret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === configuredSecret;
}

async function handleRun(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "25") || 25;

    const supabase = createAdminSupabaseClient();
    const { data: pending } = await supabase
      .from("vendor_email_broadcasts")
      .select("id, created_at")
      .eq("status", "sending")
      .order("created_at", { ascending: true })
      .limit(10);

    const results = [];
    let budgetRemaining = MAX_RECIPIENTS_PER_RUN;

    // Oldest broadcast first, so one large send doesn't starve everything
    // queued after it - each gets a slice of this run's budget in turn.
    for (const broadcast of pending ?? []) {
      if (budgetRemaining <= 0) break;

      const thisBatchLimit = Math.min(requestedLimit, budgetRemaining);
      const outcome = await processVendorEmailBroadcastBatch(broadcast.id, thisBatchLimit);
      budgetRemaining -= outcome.processed;

      results.push({ broadcastId: broadcast.id, ...outcome });
    }

    return NextResponse.json({ ok: true, broadcastsProcessed: results.length, results, ranAt: new Date().toISOString() });
  } catch (error) {
    logDevError("vendor-email-broadcast.scheduler.route", error);
    return NextResponse.json({ error: "Failed to run scheduled vendor email broadcasts." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRun(request);
}

export async function POST(request: Request) {
  return handleRun(request);
}