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
    .from("support_tickets")
    .select("id, ticket_ref, requester_email, requester_name, issue_type, details, status, admin_notes, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    logDevError("admin-console.tickets.list", error);
    return NextResponse.json({ error: "Could not load tickets." }, { status: 500 });
  }

  return NextResponse.json({ tickets: data ?? [] });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  adminNotes: z.string().max(4000).optional(),
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
  const isResolved = parsed.data.status === "resolved" || parsed.data.status === "closed";

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: parsed.data.status,
      ...(parsed.data.adminNotes !== undefined ? { admin_notes: parsed.data.adminNotes } : {}),
      ...(isResolved ? { resolved_by: session.user.id, resolved_at: new Date().toISOString() } : {}),
    })
    .eq("id", parsed.data.id);

  if (error) {
    logDevError("admin-console.tickets.update", error, { id: parsed.data.id });
    return NextResponse.json({ error: "Could not update ticket." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "support_ticket.status_changed",
    targetType: "support_ticket",
    targetId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}