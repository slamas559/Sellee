import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { recomputeStoreTier } from "@/lib/vendor-tier";
import { notifyVendorOfIdDecision } from "@/lib/vendor-verification-notify";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(5, "Give a short reason.").max(300) }),
  z.object({ action: z.literal("reinstate") }),
]);

// Manual badge control. A suspended store has no badge at all until an admin
// reinstates it; the daily recompute respects the suspension.
export async function POST(request: Request, context: { params: Promise<{ storeId: string }> }) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { storeId } = await context.params;
  if (!z.string().uuid().safeParse(storeId).success) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const suspending = parsed.data.action === "suspend";

  const { data: updated, error } = await supabase
    .from("stores")
    .update(
      suspending
        ? { verification_suspended_at: new Date().toISOString(), verification_suspended_reason: parsed.data.action === "suspend" ? parsed.data.reason : null }
        : { verification_suspended_at: null, verification_suspended_reason: null },
    )
    .eq("id", storeId)
    .select("id");

  if (error || !updated || updated.length === 0) {
    logDevError("admin-console.verification-badges", error, { storeId });
    return NextResponse.json({ error: "Could not update the badge." }, { status: 500 });
  }

  let tier: string | null = null;
  try {
    tier = (await recomputeStoreTier(storeId))?.tier ?? null;
  } catch (recomputeError) {
    logDevError("admin-console.verification-badges.recompute", recomputeError, { storeId });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: suspending ? "vendor_badge.suspended" : "vendor_badge.reinstated",
    targetType: "store",
    targetId: storeId,
    metadata: suspending && parsed.data.action === "suspend" ? { reason: parsed.data.reason } : {},
  });

  // Tell the vendor why their badge disappeared. (Reinstating needs no email:
  // the badge simply comes back.)
  if (parsed.data.action === "suspend") {
    await notifyVendorOfIdDecision({ storeId, decision: "suspended", reason: parsed.data.reason });
  }

  return NextResponse.json({ ok: true, tier });
}
