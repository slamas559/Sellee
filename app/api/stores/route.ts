import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const storeSchema = z.object({
  name: z.string().min(2).max(80),
  whatsapp_number: z.string().min(10).max(20),
  address_line1: z.string().max(120).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(80).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  location_source: z.enum(["manual", "gps"]).nullable().optional(),
  store_template: z.enum(["classic", "bold", "minimal"]).optional().default("classic"),
  theme_color: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  logo_url: z.string().url().optional().or(z.literal("")),
  is_active: z.boolean().optional().default(true),
});

async function ensureUniqueSlug(baseSlug: string, storeId?: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  let counter = 0;
  let slug = baseSlug;

  while (counter < 50) {
    let query = supabase.from("stores").select("id").eq("slug", slug).limit(1);

    if (storeId) {
      query = query.neq("id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  throw new Error("Unable to allocate a unique store slug.");
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("vendor_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logDevError("stores.get", error, { userId: session.user.id });
    return NextResponse.json({ error: "Could not load stores." }, { status: 500 });
  }

  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = storeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid store setup data." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    const { data: existingStore, error: existingStoreError } = await supabase
      .from("stores")
      .select("id")
      .eq("vendor_id", session.user.id)
      .maybeSingle();

    if (existingStoreError) {
      logDevError("stores.lookup", existingStoreError, { userId: session.user.id });
      return NextResponse.json({ error: "Could not load existing store." }, { status: 500 });
    }

    const baseSlug = slugify(parsed.data.name);

    if (!baseSlug) {
      return NextResponse.json({ error: "Store name cannot be converted to a valid slug." }, { status: 400 });
    }

    const uniqueSlug = await ensureUniqueSlug(baseSlug, existingStore?.id);
    const latitude = parsed.data.latitude ?? null;
    const longitude = parsed.data.longitude ?? null;
    const locationSource = latitude !== null && longitude !== null ? parsed.data.location_source ?? "manual" : null;

    if (existingStore) {
      const { data, error } = await supabase
        .from("stores")
        .update({
          name: parsed.data.name,
          slug: uniqueSlug,
          whatsapp_number: parsed.data.whatsapp_number,
          address_line1: parsed.data.address_line1 || null,
          city: parsed.data.city || null,
          state: parsed.data.state || null,
          country: parsed.data.country || null,
          latitude,
          longitude,
          location_source: locationSource,
          store_template: parsed.data.store_template,
          theme_color: parsed.data.theme_color,
          logo_url: parsed.data.logo_url || null,
          is_active: parsed.data.is_active,
        })
        .eq("id", existingStore.id)
        .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, rating_avg, rating_count, theme_color, is_active, created_at")
        .single();

      if (error || !data) {
        logDevError("stores.update", error, { userId: session.user.id, storeId: existingStore.id });
        return NextResponse.json({ error: "Could not update store." }, { status: 500 });
      }

      return NextResponse.json({ store: data, action: "updated" });
    }

    const { data, error } = await supabase
      .from("stores")
      .insert({
        vendor_id: session.user.id,
        name: parsed.data.name,
        slug: uniqueSlug,
        whatsapp_number: parsed.data.whatsapp_number,
        address_line1: parsed.data.address_line1 || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        latitude,
        longitude,
        location_source: locationSource,
        store_template: parsed.data.store_template,
        theme_color: parsed.data.theme_color,
        logo_url: parsed.data.logo_url || null,
        is_active: parsed.data.is_active,
      })
      .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, rating_avg, rating_count, theme_color, is_active, created_at")
      .single();

    if (error || !data) {
      logDevError("stores.create", error, { userId: session.user.id });
      return NextResponse.json({ error: "Could not create store." }, { status: 500 });
    }

    return NextResponse.json({ store: data, action: "created" });
  } catch (error) {
    logDevError("stores.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected store setup error." }, { status: 500 });
  }
}
