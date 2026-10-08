import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const holdSchema = z.discriminatedUnion("hold", [
  z.object({ hold: z.literal(true), reason: z.string().trim().min(5, "Give a short reason.").max(300) }),
  z.object({ hold: z.literal(false) }),
]);

// A hold freezes the scheduled deletion of this record's photos, for an
// investigation, a dispute or a legal request. Releasing it lets the normal
// schedule resume (and overdue photos are removed on the next daily run).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = holdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const holding = parsed.data.hold;

  const { data: updated, error } = await supabase
    .from("vendor_verifications")
    .update({
      retention_hold: holding,
      retention_hold_reason: parsed.data.hold ? parsed.data.reason : null,
    })
    .eq("id", id)
    .eq("type", "id")
    .select("id, store_id");

  if (error || !updated || updated.length === 0) {
    logDevError("admin-console.verifications.hold", error, { id });
    return NextResponse.json({ error: "Could not update the hold." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: holding ? "vendor_verification.hold_set" : "vendor_verification.hold_released",
    targetType: "vendor_verification",
    targetId: id,
    metadata: parsed.data.hold ? { reason: parsed.data.reason } : {},
  });

  return NextResponse.json({ ok: true });
}
