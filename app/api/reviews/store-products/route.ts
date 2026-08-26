import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { formatProductPathSegment } from "@/lib/format";

const querySchema = z.object({
  store_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    // product_reviews doesn't carry store_id-scoped review counts on its own,
    // so we join through products to pull every review across this vendor's
    // whole catalog, newest first, with the product's own image/name/slug
    // attached so the profile page can show what was reviewed.
    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select(
        `id, rating, comment, reviewer_name, created_at,
         product:products (id, name, slug, image_url, image_urls)`,
      )
      .eq("store_id", parsed.data.store_id)
      .order("created_at", { ascending: false })
      .limit(parsed.data.limit);

    if (error) {
      logDevError("reviews.storeProducts.get", error, { storeId: parsed.data.store_id });
      return NextResponse.json({ error: "Could not load product reviews." }, { status: 500 });
    }

    const shaped = (reviews ?? []).map((review) => {
      const product = Array.isArray(review.product) ? review.product[0] : review.product;
      const image = product?.image_url || product?.image_urls?.[0] || null;

      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer_name: review.reviewer_name,
        created_at: review.created_at,
        product: product
          ? {
              id: product.id,
              name: product.name,
              image,
              pathSegment: formatProductPathSegment(product),
            }
          : null,
      };
    });

    return NextResponse.json({ reviews: shaped });
  } catch (error) {
    logDevError("reviews.storeProducts.get.unhandled", error);
    return NextResponse.json({ error: "Unexpected error loading product reviews." }, { status: 500 });
  }
}