import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { CACHE_TAGS } from "@/lib/public-cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().default(""),
  category: z.string().max(50).optional().default(""),
  price: z.number().min(0),
  stock_count: z.number().int().min(0),
  is_available: z.boolean().default(true),
});

async function getVendorStore(vendorId: string): Promise<{ id: string; slug: string } | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id && data?.slug ? { id: data.id, slug: data.slug } : null;
}

function revalidatePublicCacheForStore(slug: string) {
  revalidateTag(CACHE_TAGS.homeMarketplaceBase, "max");
  revalidateTag(CACHE_TAGS.storeNichesFollowers, "max");
  revalidateTag(CACHE_TAGS.marketplaceBase, "max");
  revalidateTag(CACHE_TAGS.marketplaceStoreNiches, "max");
  revalidateTag(CACHE_TAGS.marketplaceProducts, "max");
  revalidateTag(CACHE_TAGS.storefrontPublic, "max");
  revalidateTag(CACHE_TAGS.storefrontBySlug(slug), "max");
}

async function getAllowedCategoriesForStore(storeId: string): Promise<string[]> {
  const supabase = createAdminSupabaseClient();
  const { data: storeNichesData, error: storeNichesError } = await supabase
    .from("store_niches")
    .select("niche_id")
    .eq("store_id", storeId);

  if (storeNichesError) {
    throw new Error(storeNichesError.message);
  }

  const nicheIds = ((storeNichesData ?? []) as Array<{ niche_id: string }>).map(
    (row) => row.niche_id,
  );

  if (nicheIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("niche_categories")
    .select("name")
    .in("niche_id", nicheIds);

  if (error) {
    throw new Error(error.message);
  }

  const names = new Set(
    ((data ?? []) as Array<{ name?: string | null }>)
      .map((row) => row.name?.trim() ?? "")
      .filter(Boolean),
  );

  return [...names].sort((a, b) => a.localeCompare(b));
}

async function uploadProductImage(vendorId: string, file: File): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const bytes = await file.arrayBuffer();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${vendorId}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, Buffer.from(bytes), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadProductImages(vendorId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadProductImage(vendorId, file);
    urls.push(url);
  }
  return urls;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = await getVendorStore(session.user.id);

    if (!store) {
      return NextResponse.json({ products: [], allowed_categories: [] });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (error) {
      logDevError("products.get", error, { userId: session.user.id, storeId: store.id });
      return NextResponse.json({ error: "Could not load products." }, { status: 500 });
    }

    let allowedCategories: string[] = [];
    try {
      allowedCategories = await getAllowedCategoriesForStore(store.id);
    } catch (categoryError) {
      logDevError("products.get.allowed-categories", categoryError, {
        userId: session.user.id,
        storeId: store.id,
      });
    }

    return NextResponse.json({ products: data ?? [], allowed_categories: allowedCategories });
  } catch (error) {
    logDevError("products.get.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected products error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      category: formData.get("category") ?? "",
      price: Number(formData.get("price")),
      stock_count: Number(formData.get("stock_count")),
      is_available: formData.get("is_available") === "true",
    });
    const categoryIsOther = formData.get("category_is_other") === "true";

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product data." }, { status: 400 });
    }

    const store = await getVendorStore(session.user.id);

    if (!store) {
      return NextResponse.json(
        { error: "Create your store first before adding products." },
        { status: 400 },
      );
    }

    let allowedCategories: string[] = [];
    try {
      allowedCategories = await getAllowedCategoriesForStore(store.id);
    } catch (categoryError) {
      logDevError("products.create.allowed-categories", categoryError, {
        userId: session.user.id,
        storeId: store.id,
      });
    }

    const normalizedCategory = parsed.data.category.trim();
    if (allowedCategories.length > 0) {
      if (!normalizedCategory) {
        return NextResponse.json(
          { error: "Select a category based on your selected niches." },
          { status: 400 },
        );
      }
      if (!allowedCategories.includes(normalizedCategory) && !categoryIsOther) {
        return NextResponse.json(
          { error: "Selected category is not allowed for your store niches." },
          { status: 400 },
        );
      }
    }

    const imageFiles = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const legacySingleImage = formData.get("image");
    if (legacySingleImage instanceof File && legacySingleImage.size > 0) {
      imageFiles.push(legacySingleImage);
    }

    const uploadedImageUrls =
      imageFiles.length > 0 ? await uploadProductImages(session.user.id, imageFiles) : [];
    const imageUrl = uploadedImageUrls[0] ?? null;

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .insert({
        store_id: store.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: normalizedCategory || null,
        price: parsed.data.price,
        image_url: imageUrl,
        image_urls: uploadedImageUrls,
        stock_count: parsed.data.stock_count,
        is_available: parsed.data.is_available,
      })
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .single();

    if (error || !data) {
      logDevError("products.create", error, { userId: session.user.id, storeId: store.id });
      return NextResponse.json({ error: "Could not create product." }, { status: 500 });
    }

    revalidatePublicCacheForStore(store.slug);

    return NextResponse.json({ product: data, message: `${data.name} (${formatNaira(Number(data.price))}) added.` });
  } catch (error) {
    logDevError("products.create.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected create product error." }, { status: 500 });
  }
}

