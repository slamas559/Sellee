import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "open";

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("product_reports")
    .select(
      "id, product_id, reporter_email, reason, details, status, created_at, product:product_id(id, name, image_url, store_id, store:store_id(name, slug))",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    logDevError("admin-console.reports.list", error);
    return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "dismissed", "actioned"]),
});

export async function PATCH(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("product_reports")
    .update({
      status: parsed.data.status,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) {
    logDevError("admin-console.reports.update", error, { id: parsed.data.id });
    return NextResponse.json({ error: "Could not update report." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "product_report.status_changed",
    targetType: "product_report",
    targetId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}