import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const createProductReviewSchema = z.object({
  product_id: z.string().uuid(),
  reviewer_name: z.string().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(600).optional().or(z.literal("")),
});

const querySchema = z.object({
  product_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

async function refreshProductRating(productId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: ratings, error } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message);
  }

  const count = ratings?.length ?? 0;
  const avg = count > 0
    ? Number(
        (
          ratings!.reduce((sum, item) => sum + Number(item.rating), 0) / count
        ).toFixed(2),
      )
    : 0;

  const { error: updateError } = await supabase
    .from("products")
    .update({ rating_avg: avg, rating_count: count })
    .eq("id", productId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product review query." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select("id, product_id, store_id, reviewer_name, rating, comment, created_at")
      .eq("product_id", parsed.data.product_id)
      .order("created_at", { ascending: false })
      .limit(parsed.data.limit);

    if (error) {
      logDevError("reviews.product.get", error, { productId: parsed.data.product_id });
      return NextResponse.json({ error: "Could not load product reviews." }, { status: 500 });
    }

    const { data: product } = await supabase
      .from("products")
      .select("rating_avg, rating_count")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    return NextResponse.json({
      reviews: reviews ?? [],
      summary: {
        rating_avg: Number(product?.rating_avg ?? 0),
        rating_count: Number(product?.rating_count ?? 0),
      },
    });
  } catch (error) {
    logDevError("reviews.product.get.unhandled", error);
    return NextResponse.json({ error: "Unexpected product review error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createProductReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product review payload." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const { error: insertError } = await supabase.from("product_reviews").insert({
      product_id: parsed.data.product_id,
      store_id: product.store_id,
      reviewer_name: parsed.data.reviewer_name.trim(),
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    });

    if (insertError) {
      logDevError("reviews.product.create", insertError, { productId: parsed.data.product_id });
      return NextResponse.json({ error: "Could not submit product review." }, { status: 500 });
    }

    await refreshProductRating(parsed.data.product_id);
    return NextResponse.json({ ok: true, message: "Product review submitted." });
  } catch (error) {
    logDevError("reviews.product.create.unhandled", error);
    return NextResponse.json({ error: "Unexpected product review create error." }, { status: 500 });
  }
}
