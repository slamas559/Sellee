import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { slugify } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/public-cache";

/** GET /api/stores/slug?slug=my-new-name — live availability check while typing */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rawSlug = new URL(req.url).searchParams.get("slug") ?? "";
  const normalized = slugify(rawSlug);

  if (!normalized || normalized !== rawSlug.trim().toLowerCase()) {
    // Reject anything that needed characters stripped/changed to become
    // valid — a vendor should see exactly what they'll get, not a silently
    // cleaned-up version, when they're deliberately picking a slug.
    return NextResponse.json({ slug: normalized, available: false, reason: "invalid_format" });
  }

  const supabase = createAdminSupabaseClient();
  const { data: existingStore } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("vendor_id", session.user.id)
    .maybeSingle();

  if (existingStore?.slug === normalized) {
    return NextResponse.json({ slug: normalized, available: true, reason: "unchanged" });
  }

  const { data, error } = await supabase.from("stores").select("id").eq("slug", normalized).limit(1);
  if (error) {
    logDevError("stores.slug.check", error, { userId: session.user.id });
    return NextResponse.json({ error: "Could not check availability." }, { status: 500 });
  }

  return NextResponse.json({ slug: normalized, available: !data || data.length === 0 });
}

/** PATCH /api/stores/slug — deliberate, explicit slug change */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const requestedSlug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const normalized = slugify(requestedSlug);

  if (!normalized || normalized !== requestedSlug) {
    return NextResponse.json({ error: "That URL contains characters that aren't allowed." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("vendor_id", session.user.id)
    .maybeSingle();

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  if (store.slug === normalized) {
    return NextResponse.json({ slug: normalized, unchanged: true });
  }

  const { data: taken } = await supabase.from("stores").select("id").eq("slug", normalized).limit(1);
  if (taken && taken.length > 0) {
    return NextResponse.json({ error: "That URL is already taken." }, { status: 409 });
  }

  const oldSlug = store.slug;
  const { data: updated, error: updateError } = await supabase
    .from("stores")
    .update({ slug: normalized })
    .eq("id", store.id)
    .select("id, slug")
    .single();

  if (updateError || !updated) {
    logDevError("stores.slug.update", updateError, { userId: session.user.id, storeId: store.id });
    return NextResponse.json({ error: "Could not update store URL." }, { status: 500 });
  }

  // Old URL now 404s — bust its cached page and its sitemap entry.
  revalidateTag(CACHE_TAGS.storefrontBySlug(oldSlug), "max");
  revalidateTag(CACHE_TAGS.storefrontBySlug(normalized), "max");

  return NextResponse.json({ slug: updated.slug });
}