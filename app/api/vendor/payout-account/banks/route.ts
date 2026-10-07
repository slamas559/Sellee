import { NextResponse } from "next/server";
import { getCachedBanks } from "@/lib/payout-accounts";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";

export async function GET() {
  const ctx = await requireVendorWorkspaceApi();
  if (ctx instanceof NextResponse) return ctx;

  // Payout details are money-related: vendor owner only, never staff.
  if (ctx.isStaff) {
    return NextResponse.json({ error: "Only the store owner can manage payout details." }, { status: 403 });
  }

  const result = await getCachedBanks();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ banks: result.banks });
}
