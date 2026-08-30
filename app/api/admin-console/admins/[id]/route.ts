import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You can't revoke your own admin access from here." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: target, error: lookupError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    logDevError("admin-console.admins.revoke.lookup", lookupError, { id });
    return NextResponse.json({ error: "Could not load that admin." }, { status: 500 });
  }

  if (!target || target.role !== "admin") {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  // These are dedicated admin-only accounts (created purely through the
  // invite flow, with no orders/products/store tied to them), so revoking
  // access removes the account outright rather than leaving a disabled
  // record behind.
  const { error: deleteError } = await supabase.from("users").delete().eq("id", id);

  if (deleteError) {
    logDevError("admin-console.admins.revoke", deleteError, { id });
    return NextResponse.json({ error: "Could not revoke admin access." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "admin.revoked",
    targetType: "user",
    targetId: id,
    metadata: { email: target.email },
  });

  return NextResponse.json({ ok: true });
}
