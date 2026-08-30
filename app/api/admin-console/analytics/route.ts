import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getPlatformAnalytics, resolveDateRange, type AnalyticsRangePreset } from "@/lib/admin-analytics";
import { logDevError } from "@/lib/logger";

const VALID_PRESETS = new Set(["today", "7d", "30d", "90d", "this_month", "last_month", "all", "custom"]);

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const presetParam = searchParams.get("range") ?? "30d";
  const preset = (VALID_PRESETS.has(presetParam) ? presetParam : "30d") as AnalyticsRangePreset;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const range = resolveDateRange(preset, from, to);
    const analytics = await getPlatformAnalytics(range);
    return NextResponse.json(analytics);
  } catch (error) {
    logDevError("admin-console.analytics", error);
    return NextResponse.json({ error: "Could not load analytics." }, { status: 500 });
  }
}