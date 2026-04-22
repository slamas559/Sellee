import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const updateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().default(""),
  category: z.string().max(50).optional().default(""),
  price: z.number().min(0),
  stock_count: z.number().int().min(0),
  is_available: z.boolean().default(true),
  remove_image: z.boolean().optional().default(false),
});

async function getVendorStoreId(vendorId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
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

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product update data." }, { status: 400 });
    }

    const storeId = await getVendorStoreId(session.user.id);

    if (!storeId) {
      return NextResponse.json({ error: "Store not found for this vendor." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("id, store_id, image_url, image_urls")
      .eq("id", id)
      .eq("store_id", storeId)
      .maybeSingle();

    if (existingProductError) {
      logDevError("products.update.lookup", existingProductError, { id, storeId });
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
    let imageUrls: string[] = Array.isArray(existingProduct.image_urls)
      ? existingProduct.image_urls.filter((item): item is string => typeof item === "string")
      : [];

    if (parsed.data.remove_image) {
      imageUrl = null;
      imageUrls = [];
    }

    if (imageFiles.length > 0) {
      imageUrls = await uploadProductImages(session.user.id, imageFiles);
      imageUrl = imageUrls[0] ?? null;
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: parsed.data.category || null,
        price: parsed.data.price,
        stock_count: parsed.data.stock_count,
        is_available: parsed.data.is_available,
        image_url: imageUrl,
        image_urls: imageUrls,
      })
      .eq("id", id)
      .eq("store_id", storeId)
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .single();

    if (error || !data) {
      logDevError("products.update", error, { id, storeId });
      return NextResponse.json({ error: "Could not update product." }, { status: 500 });
    }

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
    const storeId = await getVendorStoreId(session.user.id);

    if (!storeId) {
      return NextResponse.json({ error: "Store not found for this vendor." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId);

    if (error) {
      logDevError("products.delete", error, { id, storeId });
      return NextResponse.json({ error: "Could not delete product." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Product deleted." });
  } catch (error) {
    logDevError("products.delete.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected delete product error." }, { status: 500 });
  }
}
