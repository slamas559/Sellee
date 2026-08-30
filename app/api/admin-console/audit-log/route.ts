import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { listAuditLog } from "@/lib/audit-log";

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const entries = await listAuditLog(200);
  return NextResponse.json({ entries });
}
