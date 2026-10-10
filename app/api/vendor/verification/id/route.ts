import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorStore } from "@/lib/dashboard-data";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { getLatestIdSubmission } from "@/lib/vendor-verification";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";
import { ID_DOCUMENT_TYPE_VALUES, VERIFICATION_BUCKET } from "@/lib/verification-constants";

const submitSchema = z.object({
  document_type: z.enum(ID_DOCUMENT_TYPE_VALUES),
  id_full_name: z
    .string()
    .trim()
    .min(3, "Enter your full name as it appears on your ID.")
    .max(120)
    .refine((value) => value.split(/\s+/).length >= 2, "Enter your full name as it appears on your ID."),
  id_path: z.string().min(1).max(300),
  selfie_path: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  const ctx = await requireVendorWorkspaceApi();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.isStaff) {
    return NextResponse.json({ error: "Only the store owner can submit verification documents." }, { status: 403 });
  }

  const limit = await checkRateLimit(`verification-submit:${ctx.vendorId}`, 5, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions today. Please try again tomorrow." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." }, { status: 400 });
  }

  const store = await getVendorStore(ctx.vendorId);
  if (!store) {
    return NextResponse.json({ error: "Set up your store before submitting verification." }, { status: 400 });
  }

  // Paths must be ones WE issued for THIS store (random uuid, right suffix).
  // This stops a vendor pointing a submission at someone else's files.
  const pathPattern = (kind: "id" | "selfie") =>
    new RegExp(`^${store.id}/[0-9a-f-]{36}-${kind}\\.(jpg|png|webp)$`);

  if (!pathPattern("id").test(parsed.data.id_path) || !pathPattern("selfie").test(parsed.data.selfie_path)) {
    return NextResponse.json({ error: "Invalid upload. Please upload your photos again." }, { status: 400 });
  }

  const latest = await getLatestIdSubmission(store.id);
  if (latest?.status === "pending") {
    return NextResponse.json({ error: "Your ID is already under review." }, { status: 409 });
  }
  if (latest?.status === "approved") {
    return NextResponse.json({ error: "Your ID has already been approved." }, { status: 409 });
  }

  const supabase = createAdminSupabaseClient();
  const bucket = supabase.storage.from(VERIFICATION_BUCKET);

  // Snapshot who this is, so the record stays identifiable even if the
  // account is deleted later.
  const { data: vendorRow } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", ctx.vendorId)
    .maybeSingle();

  const [idExists, selfieExists] = await Promise.all([
    bucket.exists(parsed.data.id_path),
    bucket.exists(parsed.data.selfie_path),
  ]);

  if (!idExists.data || !selfieExists.data) {
    return NextResponse.json({ error: "We couldn't find your uploaded photos. Please upload them again." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendor_verifications")
    .insert({
      store_id: store.id,
      vendor_id: ctx.vendorId,
      type: "id",
      status: "pending",
      document_type: parsed.data.document_type,
      id_full_name: parsed.data.id_full_name,
      document_path: parsed.data.id_path,
      selfie_path: parsed.data.selfie_path,
      store_name: store.name,
      vendor_email: (vendorRow?.email as string | undefined) ?? null,
      vendor_full_name: (vendorRow?.full_name as string | null | undefined) ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // 23505 = the one-pending-per-store index: a double submit.
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Your ID is already under review." }, { status: 409 });
    }
    logDevError("verification.id.submit", error, { storeId: store.id });
    return NextResponse.json({ error: "Could not submit your ID. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission_id: data.id });
}
