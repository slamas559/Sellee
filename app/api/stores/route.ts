import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { CACHE_TAGS } from "@/lib/public-cache";
import { DEFAULT_STOREFRONT_CONFIG, normalizeStoreTemplate, normalizeThemePreset, normalizeStorefrontConfig } from "@/lib/storefront";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { validateWhatsAppNumber } from "@/lib/whatsapp";

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
  store_template: z.enum(["grocery_promo", "fashion_editorial", "lifestyle_showcase", "modern_grid"]).optional().default("grocery_promo"),
  store_theme_preset: z.enum(["emerald_fresh", "sunlit_market", "midnight_luxe", "ocean_breeze", "rose_boutique"]).optional().default("emerald_fresh"),
  storefront_config: z
    .object({
      hero_title: z.string().max(120).optional(),
      hero_subtitle: z.string().max(220).optional(),
      hero_cta_text: z.string().max(40).optional(),
      hero_image_url: z.string().url().optional().or(z.literal("")),
      promo_text: z.string().max(120).optional(),
      secondary_banner_url: z.string().url().optional().or(z.literal("")),
      banner_urls: z.array(z.string().url()).max(8).optional(),
      sections_order: z
        .array(z.enum(["featured_products", "promo_strip", "reviews"]))
        .optional(),
    })
    .optional(),
  theme_color: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  logo_url: z.string().url().optional().or(z.literal("")),
  niche_ids: z.array(z.string().uuid()).max(8).optional().default([]),
  custom_niches: z.array(z.string().min(2).max(80)).max(8).optional().default([]),
  is_active: z.boolean().optional().default(true),
});

type ParsedStoreInput = z.infer<typeof storeSchema>;

function revalidatePublicCacheForStore(slug: string) {
  revalidateTag(CACHE_TAGS.homeMarketplaceBase);
  revalidateTag(CACHE_TAGS.storeNichesFollowers);
  revalidateTag(CACHE_TAGS.marketplaceBase);
  revalidateTag(CACHE_TAGS.marketplaceStoreNiches);
  revalidateTag(CACHE_TAGS.marketplaceProducts);
  revalidateTag(CACHE_TAGS.storefrontPublic);
  revalidateTag(CACHE_TAGS.storefrontBySlug(slug));
}

type StoreUploadFiles = {
  logoFile: File | null;
  heroImageFile: File | null;
  secondaryBannerFile: File | null;
};

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

function asFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

async function parseStoreRequest(request: Request): Promise<{
  parsed: ReturnType<typeof storeSchema.safeParse>;
  files: StoreUploadFiles;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const storefrontConfigRaw = toOptionalString(formData.get("storefront_config"));
    let storefrontConfig: unknown = undefined;

    if (storefrontConfigRaw) {
      try {
        storefrontConfig = JSON.parse(storefrontConfigRaw);
      } catch {
        storefrontConfig = undefined;
      }
    }

    const parsed = storeSchema.safeParse({
      name: toOptionalString(formData.get("name")),
      whatsapp_number: toOptionalString(formData.get("whatsapp_number")),
      address_line1: toOptionalString(formData.get("address_line1")) ?? "",
      city: toOptionalString(formData.get("city")) ?? "",
      state: toOptionalString(formData.get("state")) ?? "",
      country: toOptionalString(formData.get("country")) ?? "",
      latitude: toOptionalString(formData.get("latitude"))
        ? Number(toOptionalString(formData.get("latitude")))
        : null,
      longitude: toOptionalString(formData.get("longitude"))
        ? Number(toOptionalString(formData.get("longitude")))
        : null,
      location_source: toOptionalString(formData.get("location_source")) ?? null,
      store_template: toOptionalString(formData.get("store_template")),
      store_theme_preset: toOptionalString(formData.get("store_theme_preset")),
      storefront_config: storefrontConfig,
      theme_color: toOptionalString(formData.get("theme_color")),
      logo_url: toOptionalString(formData.get("logo_url")) ?? "",
      niche_ids: (() => {
        const raw = toOptionalString(formData.get("niche_ids"));
        if (!raw) return [];
        try {
          const parsedNiches = JSON.parse(raw);
          return Array.isArray(parsedNiches) ? parsedNiches : [];
        } catch {
          return [];
        }
      })(),
      custom_niches: (() => {
        const raw = toOptionalString(formData.get("custom_niches"));
        if (!raw) return [];
        try {
          const parsedCustom = JSON.parse(raw);
          return Array.isArray(parsedCustom) ? parsedCustom : [];
        } catch {
          return [];
        }
      })(),
      is_active: toOptionalString(formData.get("is_active")) === "true",
    });

    return {
      parsed,
      files: {
        logoFile: asFile(formData.get("logo_file")),
        heroImageFile: asFile(formData.get("hero_image_file")),
        secondaryBannerFile: asFile(formData.get("secondary_banner_file")),
      },
    };
  }

  const body = await request.json();
  return {
    parsed: storeSchema.safeParse(body),
    files: {
      logoFile: null,
      heroImageFile: null,
      secondaryBannerFile: null,
    },
  };
}

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

type StoreRow = {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: "manual" | "gps" | null;
  store_template: string;
  store_theme_preset: string;
  storefront_config: unknown;
  rating_avg: number;
  rating_count: number;
  theme_color: string | null;
  is_active: boolean;
  created_at: string;
};

async function validateNicheIds(nicheIds: string[]): Promise<string[]> {
  if (nicheIds.length === 0) return [];
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("niches").select("id").in("id", nicheIds);
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function ensureNicheIdsByNames(names: string[]): Promise<string[]> {
  const uniqueNames = Array.from(
    new Set(names.map((name) => name.trim()).filter((name) => name.length >= 2)),
  );
  if (uniqueNames.length === 0) return [];

  const supabase = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("niches")
    .select("id, name")
    .in("name", uniqueNames);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingRows = (existing ?? []) as Array<{ id: string; name: string }>;
  const existingByName = new Map(existingRows.map((row) => [row.name.toLowerCase(), row.id]));
  const missing = uniqueNames.filter((name) => !existingByName.has(name.toLowerCase()));

  if (missing.length > 0) {
    const rows = missing.map((name) => ({
      name,
      slug: slugify(name),
    }));
    const { error: insertError } = await supabase
      .from("niches")
      .upsert(rows, { onConflict: "slug" });
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { data: allRows, error: allRowsError } = await supabase
    .from("niches")
    .select("id, name")
    .in("name", uniqueNames);

  if (allRowsError) {
    throw new Error(allRowsError.message);
  }

  return ((allRows ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function saveStoreNiches(storeId: string, nicheIds: string[], customNiches: string[]) {
  const supabase = createAdminSupabaseClient();
  const validIds = await validateNicheIds(Array.from(new Set(nicheIds)));
  const customIds = await ensureNicheIdsByNames(customNiches);
  const mergedIds = Array.from(new Set([...validIds, ...customIds])).slice(0, 8);

  const { error: deleteError } = await supabase
    .from("store_niches")
    .delete()
    .eq("store_id", storeId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (mergedIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("store_niches")
    .insert(mergedIds.map((nicheId) => ({ store_id: storeId, niche_id: nicheId })));

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function attachNichesToStores(stores: StoreRow[]) {
  if (stores.length === 0) return [];

  const supabase = createAdminSupabaseClient();
  const storeIds = stores.map((store) => store.id);
  const { data, error } = await supabase
    .from("store_niches")
    .select("store_id, niche_id, niche:niche_id(name)")
    .in("store_id", storeIds);

  if (error) {
    throw new Error(error.message);
  }

  const grouped = new Map<string, { niche_ids: string[]; niche_names: string[] }>();
  for (const row of ((data ?? []) as Array<{ store_id: string; niche_id: string; niche?: { name?: string } | null }>)) {
    const current = grouped.get(row.store_id) ?? { niche_ids: [], niche_names: [] };
    current.niche_ids.push(row.niche_id);
    if (row.niche?.name) {
      current.niche_names.push(row.niche.name);
    }
    grouped.set(row.store_id, current);
  }

  return stores.map((store) => ({
    ...store,
    niche_ids: grouped.get(store.id)?.niche_ids ?? [],
    niche_names: grouped.get(store.id)?.niche_names ?? [],
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("vendor_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logDevError("stores.get", error, { userId: session.user.id });
    return NextResponse.json({ error: "Could not load stores." }, { status: 500 });
  }

  try {
    const storesWithNiches = await attachNichesToStores((data ?? []) as StoreRow[]);
    return NextResponse.json({ stores: storesWithNiches });
  } catch (error) {
    logDevError("stores.get.attach-niches", error, { userId: session.user.id });
    return NextResponse.json({ stores: data ?? [] });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { parsed, files } = await parseStoreRequest(request);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid store setup data." }, { status: 400 });
    }
    const whatsappCheck = validateWhatsAppNumber(parsed.data.whatsapp_number);
    if (!whatsappCheck.ok) {
      return NextResponse.json(
        { error: whatsappCheck.error ?? "Enter a valid WhatsApp number." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data: existingStore, error: existingStoreError } = await supabase
      .from("stores")
      .select("id, slug, logo_url, storefront_config")
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
    const storeTemplate = normalizeStoreTemplate(parsed.data.store_template);
    const storeThemePreset = normalizeThemePreset(parsed.data.store_theme_preset);
    const existingConfig = normalizeStorefrontConfig(existingStore?.storefront_config);
    const parsedData: ParsedStoreInput = parsed.data;
    const storefrontConfig = normalizeStorefrontConfig(
      parsedData.storefront_config ??
        (existingStore ? existingConfig : DEFAULT_STOREFRONT_CONFIG),
    );

    let logoUrl: string | null =
      parsedData.logo_url === ""
        ? existingStore?.logo_url ?? null
        : parsedData.logo_url || existingStore?.logo_url || null;

    if (files.logoFile) {
      logoUrl = await uploadStoreAsset(session.user.id, files.logoFile, "logo");
    }
    if (files.heroImageFile) {
      storefrontConfig.hero_image_url = await uploadStoreAsset(
        session.user.id,
        files.heroImageFile,
        "hero",
      );
    }
    if (files.secondaryBannerFile) {
      const uploadedBannerUrl = await uploadStoreAsset(
        session.user.id,
        files.secondaryBannerFile,
        "banner",
      );
      storefrontConfig.banner_urls = Array.from(
        new Set([uploadedBannerUrl, ...(storefrontConfig.banner_urls ?? [])]),
      ).slice(0, 8);
      storefrontConfig.secondary_banner_url = storefrontConfig.banner_urls[0] ?? uploadedBannerUrl;
    }

    if (existingStore) {
      const { data, error } = await supabase
        .from("stores")
        .update({
          name: parsedData.name,
          slug: uniqueSlug,
          whatsapp_number: whatsappCheck.normalized,
          address_line1: parsedData.address_line1 || null,
          city: parsedData.city || null,
          state: parsedData.state || null,
          country: parsedData.country || null,
          latitude,
          longitude,
          location_source: locationSource,
          store_template: storeTemplate,
          store_theme_preset: storeThemePreset,
          storefront_config: storefrontConfig,
          theme_color: parsedData.theme_color,
          logo_url: logoUrl,
          is_active: parsedData.is_active,
        })
        .eq("id", existingStore.id)
        .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
        .single();

      if (error || !data) {
        logDevError("stores.update", error, { userId: session.user.id, storeId: existingStore.id });
        return NextResponse.json({ error: "Could not update store." }, { status: 500 });
      }

      try {
        await saveStoreNiches(data.id, parsedData.niche_ids ?? [], parsedData.custom_niches ?? []);
      } catch (nicheError) {
        logDevError("stores.update.niches", nicheError, { storeId: data.id, userId: session.user.id });
        return NextResponse.json({ error: "Store updated, but niches could not be saved." }, { status: 500 });
      }

      const [storeWithNiches] = await attachNichesToStores([data as StoreRow]);
      revalidatePublicCacheForStore(data.slug);
      if (existingStore?.slug && existingStore.slug !== data.slug) {
        revalidateTag(CACHE_TAGS.storefrontBySlug(existingStore.slug));
      }

      const { data: promotedRows, error: roleError } = await supabase
        .from("users")
        .update({ role: "vendor" })
        .eq("id", session.user.id)
        .neq("role", "vendor")
        .select("id");

      if (roleError) {
        logDevError("stores.promote-vendor.update", roleError, { userId: session.user.id });
      }

      return NextResponse.json({
        store: storeWithNiches,
        action: "updated",
        became_vendor: Boolean(promotedRows?.length),
      });
    }

    const { data, error } = await supabase
      .from("stores")
      .insert({
        vendor_id: session.user.id,
        name: parsedData.name,
        slug: uniqueSlug,
        whatsapp_number: whatsappCheck.normalized,
        address_line1: parsedData.address_line1 || null,
        city: parsedData.city || null,
        state: parsedData.state || null,
        country: parsedData.country || null,
        latitude,
        longitude,
        location_source: locationSource,
        store_template: storeTemplate,
        store_theme_preset: storeThemePreset,
        storefront_config: storefrontConfig,
        theme_color: parsedData.theme_color,
        logo_url: logoUrl,
        is_active: parsedData.is_active,
      })
      .select("id, vendor_id, name, slug, logo_url, whatsapp_number, address_line1, city, state, country, latitude, longitude, location_source, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
      .single();

    if (error || !data) {
      logDevError("stores.create", error, { userId: session.user.id });
      return NextResponse.json({ error: "Could not create store." }, { status: 500 });
    }

    try {
      await saveStoreNiches(data.id, parsedData.niche_ids ?? [], parsedData.custom_niches ?? []);
    } catch (nicheError) {
      logDevError("stores.create.niches", nicheError, { storeId: data.id, userId: session.user.id });
      return NextResponse.json({ error: "Store created, but niches could not be saved." }, { status: 500 });
    }

    const [storeWithNiches] = await attachNichesToStores([data as StoreRow]);
    revalidatePublicCacheForStore(data.slug);

    const { data: promotedRows, error: roleError } = await supabase
      .from("users")
      .update({ role: "vendor" })
      .eq("id", session.user.id)
      .neq("role", "vendor")
      .select("id");

    if (roleError) {
      logDevError("stores.promote-vendor.create", roleError, { userId: session.user.id });
    }

    return NextResponse.json({
      store: storeWithNiches,
      action: "created",
      became_vendor: Boolean(promotedRows?.length),
    });
  } catch (error) {
    logDevError("stores.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected store setup error." }, { status: 500 });
  }
}
