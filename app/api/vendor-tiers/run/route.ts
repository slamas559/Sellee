import { NextResponse } from "next/server";
import { logDevError } from "@/lib/logger";
import { recomputeAllStoreTiers } from "@/lib/vendor-tier";
import { runVerificationRetention } from "@/lib/vendor-verification-cleanup";

export const maxDuration = 60;

// Same dual-mode auth as the other cron endpoints: an external scheduler
// with a bearer secret, or Vercel's own cron header when explicitly opted in.
function isAuthorized(request: Request): boolean {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const allowVercelCron = process.env.VENDOR_TIER_ALLOW_VERCEL_CRON === "true";

  if (allowVercelCron && Boolean(vercelCronHeader)) {
    return true;
  }

  const configuredSecret = process.env.VENDOR_TIER_CRON_SECRET;

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
    const tiers = await recomputeAllStoreTiers();

    // Housekeeping should never fail the tier run.
    let cleanup: Awaited<ReturnType<typeof runVerificationRetention>> | { error: string };
    try {
      cleanup = await runVerificationRetention();
    } catch (error) {
      logDevError("vendor-tiers.cleanup", error);
      cleanup = { error: "cleanup failed" };
    }

    return NextResponse.json({ ok: true, tiers, cleanup, ranAt: new Date().toISOString() });
  } catch (error) {
    logDevError("vendor-tiers.run", error);
    return NextResponse.json({ error: "Failed to run the vendor tier sweep." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRun(request);
}

export async function POST(request: Request) {
  return handleRun(request);
}
