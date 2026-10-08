import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { REJECTED_PHOTO_RETENTION_DAYS } from "@/lib/verification-constants";
import { recomputeStoreTierSafe } from "@/lib/vendor-tier";
import { notifyVendorOfIdDecision } from "@/lib/vendor-verification-notify";

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    // Required when the vendor has a payout account: the admin explicitly
    // says whether its name matches the ID.
    bank_name_match: z.enum(["matched", "mismatch"]).optional(),
  }),
  z.object({
    decision: z.literal("reject"),
    reason: z.string().trim().min(5, "Give the vendor a short reason.").max(300),
  }),
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: row } = await supabase
    .from("vendor_verifications")
    .select("id, store_id, status")
    .eq("id", id)
    .eq("type", "id")
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "This submission has already been reviewed." }, { status: 409 });
  }

  const storeId = row.store_id as string;
  const reviewedAt = new Date().toISOString();

  if (parsed.data.decision === "approve") {
    const { data: payout } = await supabase
      .from("vendor_payout_accounts")
      .select("id")
      .eq("store_id", storeId)
      .maybeSingle();

    if (payout && !parsed.data.bank_name_match) {
      return NextResponse.json(
        { error: "Say whether the payout account name matches the ID before approving." },
        { status: 400 },
      );
    }

    // The status guard makes a double-click or two admins reviewing at once
    // safe: only one of them can flip the row out of 'pending'.
    const { data: updated, error: updateError } = await supabase
      .from("vendor_verifications")
      .update({
        status: "approved",
        reviewer_id: session.user.id,
        reviewed_at: reviewedAt,
        rejection_reason: null,
        // Approved IDs are kept while the account exists.
        photos_purge_at: null,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      logDevError("admin-console.verifications.approve", updateError, { id });
      return NextResponse.json({ error: "Could not approve this submission." }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "This submission has already been reviewed." }, { status: 409 });
    }

    if (payout && parsed.data.bank_name_match) {
      const { error: payoutError } = await supabase
        .from("vendor_payout_accounts")
        .update({ name_match_status: parsed.data.bank_name_match, updated_at: reviewedAt })
        .eq("store_id", storeId);

      if (payoutError) {
        logDevError("admin-console.verifications.payout-status", payoutError, { id, storeId });
        return NextResponse.json(
          { error: "ID approved, but the bank name check couldn't be saved. Review it again from the Approved tab." },
          { status: 500 },
        );
      }
    }

    await writeAuditLog({
      adminId: session.user.id,
      action: "vendor_verification.approved",
      targetType: "vendor_verification",
      targetId: id,
      metadata: { store_id: storeId, bank_name_match: parsed.data.bank_name_match ?? null },
    });

    // Refresh the badge now, then tell the vendor. Neither can fail the review.
    const recomputed = await recomputeStoreTierSafe(storeId);
    await notifyVendorOfIdDecision({
      storeId,
      decision: "approved",
      badgeLive: (recomputed?.tier ?? "none") !== "none",
    });

    return NextResponse.json({ ok: true });
  }

  const { data: updated, error: updateError } = await supabase
    .from("vendor_verifications")
    .update({
      status: "rejected",
      reviewer_id: session.user.id,
      reviewed_at: reviewedAt,
      rejection_reason: parsed.data.reason,
      // Rejected photos aren't needed for long: schedule their deletion.
      photos_purge_at: new Date(Date.now() + REJECTED_PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (updateError) {
    logDevError("admin-console.verifications.reject", updateError, { id });
    return NextResponse.json({ error: "Could not reject this submission." }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "This submission has already been reviewed." }, { status: 409 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "vendor_verification.rejected",
    targetType: "vendor_verification",
    targetId: id,
    metadata: { store_id: storeId, reason: parsed.data.reason },
  });

  await recomputeStoreTierSafe(storeId);
  await notifyVendorOfIdDecision({ storeId, decision: "rejected", reason: parsed.data.reason });

  return NextResponse.json({ ok: true });
}
