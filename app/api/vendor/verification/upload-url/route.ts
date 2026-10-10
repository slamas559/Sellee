import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorStore } from "@/lib/dashboard-data";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { getLatestIdSubmission } from "@/lib/vendor-verification";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";
import {
  ALLOWED_VERIFICATION_IMAGE_TYPES,
  IMAGE_EXTENSION_BY_TYPE,
  VERIFICATION_BUCKET,
} from "@/lib/verification-constants";

const uploadUrlSchema = z.object({
  kind: z.enum(["id", "selfie"]),
  content_type: z.enum(ALLOWED_VERIFICATION_IMAGE_TYPES),
});

// Hands the browser a short-lived signed URL so the photo goes straight to
// the private bucket. Phone photos are often over the ~4.5 MB request-body
// limit serverless platforms put on API routes, so they can't be posted to
// our own server.
export async function POST(request: Request) {
  const ctx = await requireVendorWorkspaceApi();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.isStaff) {
    return NextResponse.json({ error: "Only the store owner can submit verification documents." }, { status: 403 });
  }

  const limit = await checkRateLimit(`verification-upload:${ctx.vendorId}`, 12, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Upload a JPG, PNG or WebP image." }, { status: 400 });
  }

  const store = await getVendorStore(ctx.vendorId);
  if (!store) {
    return NextResponse.json({ error: "Set up your store before submitting verification." }, { status: 400 });
  }

  const latest = await getLatestIdSubmission(store.id);
  if (latest?.status === "pending") {
    return NextResponse.json({ error: "Your ID is already under review." }, { status: 409 });
  }
  if (latest?.status === "approved") {
    return NextResponse.json({ error: "Your ID has already been approved." }, { status: 409 });
  }

  const extension = IMAGE_EXTENSION_BY_TYPE[parsed.data.content_type];
  const path = `${store.id}/${randomUUID()}-${parsed.data.kind}.${extension}`;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage.from(VERIFICATION_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    logDevError("verification.upload-url", error, { storeId: store.id });
    return NextResponse.json({ error: "Could not start the upload. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
