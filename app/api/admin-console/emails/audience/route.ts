import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { resolveAudience, type BroadcastSegment } from "@/lib/email-broadcasts";

const VALID_SEGMENTS = new Set(["all_customers", "all_vendors", "verified_vendors", "niche"]);

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment") ?? "";
  const nicheId = searchParams.get("nicheId");

  if (!VALID_SEGMENTS.has(segment)) {
    return NextResponse.json({ error: "Invalid segment." }, { status: 400 });
  }
  if (segment === "niche" && !nicheId) {
    return NextResponse.json({ count: 0 });
  }

  const audience = await resolveAudience(segment as BroadcastSegment, nicheId);
  return NextResponse.json({ count: audience.length });
}