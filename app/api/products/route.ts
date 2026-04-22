import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().default(""),
  category: z.string().max(50).optional().default(""),
  price: z.number().min(0),
  stock_count: z.number().int().min(0),
  is_available: z.boolean().default(true),
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

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const storeId = await getVendorStoreId(session.user.id);

    if (!storeId) {
      return NextResponse.json({ products: [] });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      logDevError("products.get", error, { userId: session.user.id, storeId });
      return NextResponse.json({ error: "Could not load products." }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] });
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

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product data." }, { status: 400 });
    }

    const storeId = await getVendorStoreId(session.user.id);

    if (!storeId) {
      return NextResponse.json(
        { error: "Create your store first before adding products." },
        { status: 400 },
      );
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
        store_id: storeId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: parsed.data.category || null,
        price: parsed.data.price,
        image_url: imageUrl,
        image_urls: uploadedImageUrls,
        stock_count: parsed.data.stock_count,
        is_available: parsed.data.is_available,
      })
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .single();

    if (error || !data) {
      logDevError("products.create", error, { userId: session.user.id, storeId });
      return NextResponse.json({ error: "Could not create product." }, { status: 500 });
    }

    return NextResponse.json({ product: data, message: `${data.name} (${formatNaira(Number(data.price))}) added.` });
  } catch (error) {
    logDevError("products.create.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected create product error." }, { status: 500 });
  }
}
