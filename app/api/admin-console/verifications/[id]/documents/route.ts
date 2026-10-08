import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { VERIFICATION_BUCKET } from "@/lib/verification-constants";

const SIGNED_URL_SECONDS = 300;

// Signed URLs are only issued on demand (not for the whole queue), and every
// issue is audit-logged: ID photos are sensitive, so there should be a
// record of who looked at them.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: row, error } = await supabase
    .from("vendor_verifications")
    .select("id, store_id, document_path, selfie_path, photos_purged_at")
    .eq("id", id)
    .eq("type", "id")
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (row.photos_purged_at || !row.document_path || !row.selfie_path) {
    return NextResponse.json({ error: "These photos were deleted under the retention schedule." }, { status: 410 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrls([row.document_path as string, row.selfie_path as string], SIGNED_URL_SECONDS);

  const idUrl = signed?.find((item) => item.path === row.document_path)?.signedUrl;
  const selfieUrl = signed?.find((item) => item.path === row.selfie_path)?.signedUrl;

  if (signError || !idUrl || !selfieUrl) {
    logDevError("admin-console.verifications.documents", signError, { id });
    return NextResponse.json({ error: "Could not load the photos." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "vendor_verification.documents_viewed",
    targetType: "vendor_verification",
    targetId: id,
    metadata: { store_id: row.store_id },
  });

  return NextResponse.json({ id_url: idUrl, selfie_url: selfieUrl, expires_in_seconds: SIGNED_URL_SECONDS });
}
