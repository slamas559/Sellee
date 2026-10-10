import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";
import { logDevError } from "@/lib/logger";
import { ImageValidationError, readValidatedImage } from "@/lib/image-upload";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const ALLOWED_KINDS = new Set(["logo", "hero", "banner"]);

async function uploadStoreAsset(vendorId: string, file: File, kind: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const image = await readValidatedImage(file);
  const path = `${vendorId}/storefront/${kind}-${randomUUID()}.${image.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("store-assets")
    .upload(path, image.buffer, {
      contentType: image.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: Request) {
  const ctx = await requireVendorWorkspaceApi("store_settings");
  if (ctx instanceof NextResponse) return ctx;
  const { vendorId } = ctx;

  try {
    const formData = await request.formData();
    const kind = String(formData.get("kind") ?? "");
    const file = formData.get("file");

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid upload kind." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    const url = await uploadStoreAsset(vendorId, file, kind);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logDevError("stores.upload", error, { userId: vendorId });
    return NextResponse.json({ error: "Could not upload image." }, { status: 500 });
  }
}
