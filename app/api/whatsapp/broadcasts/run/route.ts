import { NextResponse } from "next/server";
import { runDueScheduledBroadcasts } from "@/lib/whatsapp-bot/broadcasts";
import { logDevError } from "@/lib/logger";

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.WHATSAPP_BROADCAST_CRON_SECRET;

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
    const limitRaw = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

    const summary = await runDueScheduledBroadcasts(limit);
    return NextResponse.json({
      ok: true,
      ...summary,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    logDevError("whatsapp.broadcast.scheduler.route", error);
    return NextResponse.json(
      { error: "Failed to run scheduled broadcasts." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleRun(request);
}

export async function POST(request: Request) {
  return handleRun(request);
}
