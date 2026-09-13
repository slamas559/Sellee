import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getBillingOverview } from "@/lib/admin-billing";

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const overview = await getBillingOverview();
  if (!overview) {
    return NextResponse.json({ error: "Could not load billing overview." }, { status: 500 });
  }

  return NextResponse.json(overview);
}