import { NextResponse } from "next/server";
import { logDevError } from "@/lib/logger";
import { sendUpcomingRenewalReminders, expireOverdueSubscriptions } from "@/lib/subscriptions/renewals";

export const maxDuration = 60;

// Same dual-mode auth as /api/email-broadcasts/run and
// /api/whatsapp/broadcasts/run: either an external scheduler with a bearer
// secret, or Vercel's own cron header when explicitly opted in.
function isAuthorized(request: Request): boolean {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const allowVercelCron = process.env.SUBSCRIPTION_RENEWAL_ALLOW_VERCEL_CRON === "true";

  if (allowVercelCron && Boolean(vercelCronHeader)) {
    return true;
  }

  const configuredSecret = process.env.SUBSCRIPTION_RENEWAL_CRON_SECRET;

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
    // Order matters: send reminders for things expiring soon BEFORE
    // downgrading things that already expired, so a subscription can never
    // get skipped by a reminder query that only looked at one moment in
    // time as it crosses from "upcoming" to "overdue" mid-run.
    const reminders = await sendUpcomingRenewalReminders();
    const expirations = await expireOverdueSubscriptions();

    return NextResponse.json({
      ok: true,
      reminders,
      expirations,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    logDevError("subscriptions.renewals.run", error);
    return NextResponse.json({ error: "Failed to run subscription renewal sweep." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRun(request);
}

export async function POST(request: Request) {
  return handleRun(request);
}