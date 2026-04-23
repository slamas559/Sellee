import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const ALLOWED_KINDS = new Set(["logo", "hero", "banner"]);

async function uploadStoreAsset(vendorId: string, file: File, kind: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const bytes = await file.arrayBuffer();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${vendorId}/storefront/${kind}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("store-assets")
    .upload(path, Buffer.from(bytes), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const url = await uploadStoreAsset(session.user.id, file, kind);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    logDevError("stores.upload", error, { userId: session.user.id });
    return NextResponse.json({ error: "Could not upload image." }, { status: 500 });
  }
}
