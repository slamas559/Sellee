import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { CACHE_TAGS } from "@/lib/public-cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { notifyRestockSubscribers } from "@/lib/whatsapp-bot/restock-alerts";

const updateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().default(""),
  category: z.string().max(50).optional().default(""),
  price: z.number().min(0),
  stock_count: z.number().int().min(0),
  is_available: z.boolean().default(true),
  remove_image: z.boolean().optional().default(false),
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

async function getStoreName(storeId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.name ?? null;
}

function revalidatePublicCacheForStore(slug: string) {
  revalidateTag(CACHE_TAGS.homeMarketplaceBase);
  revalidateTag(CACHE_TAGS.storeNichesFollowers);
  revalidateTag(CACHE_TAGS.marketplaceBase);
  revalidateTag(CACHE_TAGS.marketplaceStoreNiches);
  revalidateTag(CACHE_TAGS.marketplaceProducts);
  revalidateTag(CACHE_TAGS.storefrontPublic);
  revalidateTag(CACHE_TAGS.storefrontBySlug(slug));
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const formData = await request.formData();

    const parsed = updateSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      category: formData.get("category") ?? "",
      price: Number(formData.get("price")),
      stock_count: Number(formData.get("stock_count")),
      is_available: formData.get("is_available") === "true",
      remove_image: formData.get("remove_image") === "true",
    });
    const categoryIsOther = formData.get("category_is_other") === "true";

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product update data." }, { status: 400 });
    }

    const store = await getVendorStore(session.user.id);

    if (!store) {
      return NextResponse.json({ error: "Store not found for this vendor." }, { status: 400 });
    }

    let allowedCategories: string[] = [];
    try {
      allowedCategories = await getAllowedCategoriesForStore(store.id);
    } catch (categoryError) {
      logDevError("products.update.allowed-categories", categoryError, {
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

    const supabase = createAdminSupabaseClient();

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("id, store_id, name, stock_count, image_url, image_urls")
      .eq("id", id)
      .eq("store_id", store.id)
      .maybeSingle();

    if (existingProductError) {
      logDevError("products.update.lookup", existingProductError, { id, storeId: store.id });
      return NextResponse.json({ error: "Could not load product." }, { status: 500 });
    }

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const imageFiles = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const legacySingleImage = formData.get("image");
    if (legacySingleImage instanceof File && legacySingleImage.size > 0) {
      imageFiles.push(legacySingleImage);
    }

    let imageUrl: string | null = existingProduct.image_url;
    const existingImageUrls: string[] = Array.isArray(existingProduct.image_urls)
      ? existingProduct.image_urls.filter((item): item is string => typeof item === "string")
      : [];
    let imageUrls: string[] = [...existingImageUrls];

    const keepImageUrlsRaw = formData.get("keep_image_urls");
    if (typeof keepImageUrlsRaw === "string" && keepImageUrlsRaw.trim()) {
      try {
        const parsedKeep = JSON.parse(keepImageUrlsRaw) as unknown;
        if (Array.isArray(parsedKeep)) {
          const requested = parsedKeep.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          );
          imageUrls = requested.filter((url) => existingImageUrls.includes(url));
        }
      } catch {
        // Ignore malformed keep list and default to existing image order.
      }
    }

    if (parsed.data.remove_image) {
      imageUrl = null;
      imageUrls = [];
    }

    if (imageFiles.length > 0) {
      const uploadedImageUrls = await uploadProductImages(session.user.id, imageFiles);
      imageUrls = [...imageUrls, ...uploadedImageUrls];
    }
    imageUrl = imageUrls[0] ?? null;

    const { data, error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: normalizedCategory || null,
        price: parsed.data.price,
        stock_count: parsed.data.stock_count,
        is_available: parsed.data.is_available,
        image_url: imageUrl,
        image_urls: imageUrls,
      })
      .eq("id", id)
      .eq("store_id", store.id)
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .single();

    if (error || !data) {
      logDevError("products.update", error, { id, storeId: store.id });
      return NextResponse.json({ error: "Could not update product." }, { status: 500 });
    }

    const previousStock = Number(existingProduct.stock_count ?? 0);
    const nextStock = Number(parsed.data.stock_count);
    const becameInStock = previousStock <= 0 && nextStock > 0;

    if (becameInStock) {
      try {
        const storeName = (await getStoreName(store.id)) ?? "your store";
        await notifyRestockSubscribers({
          storeId: store.id,
          storeName,
          productId: data.id,
          productName: data.name,
        });
      } catch (restockError) {
        logDevError("products.update.restock-notify", restockError, {
          id,
          storeId: store.id,
          previousStock,
          nextStock,
        });
      }
    }

    revalidatePublicCacheForStore(store.slug);

    return NextResponse.json({ product: data, message: "Product updated successfully." });
  } catch (error) {
    logDevError("products.update.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected product update error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const store = await getVendorStore(session.user.id);

    if (!store) {
      return NextResponse.json({ error: "Store not found for this vendor." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      logDevError("products.delete", error, { id, storeId: store.id });
      return NextResponse.json({ error: "Could not delete product." }, { status: 500 });
    }

    revalidatePublicCacheForStore(store.slug);

    return NextResponse.json({ ok: true, message: "Product deleted." });
  } catch (error) {
    logDevError("products.delete.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected delete product error." }, { status: 500 });
  }
}

