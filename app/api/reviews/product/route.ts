import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const createProductReviewSchema = z.object({
  product_id: z.string().uuid(),
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

function deriveDisplayName(fullName: string | null, email: string): string {
  if (fullName?.trim()) {
    return fullName.trim();
  }

  const local = (email.split("@")[0] ?? "customer").replace(/[._-]+/g, " ").trim();
  if (!local) return "Customer";

  return local
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please log in to submit a product review." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createProductReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product review payload." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("full_name, email, parent_vendor_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError || !user?.email) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const { data: productStore } = await supabase
      .from("stores")
      .select("vendor_id")
      .eq("id", product.store_id)
      .maybeSingle();

    // A store's own team can't review its products.
    if (
      productStore &&
      (productStore.vendor_id === session.user.id || user.parent_vendor_id === productStore.vendor_id)
    ) {
      return NextResponse.json({ error: "You can't review your own product." }, { status: 403 });
    }

    // A review must come from a delivered order of this person's that
    // contained the product and hasn't been used for a review of it yet.
    const { data: orderLines } = await supabase
      .from("order_items")
      .select("order_id, orders!inner(id, customer_user_id, status, delivered_at)")
      .eq("product_id", parsed.data.product_id)
      .eq("orders.customer_user_id", session.user.id)
      .eq("orders.status", "delivered")
      .limit(100);

    const deliveredIds = [...new Set((orderLines ?? []).map((line) => line.order_id as string))];
    if (deliveredIds.length === 0) {
      return NextResponse.json(
        { error: "You can review a product after you've received it in an order." },
        { status: 403 },
      );
    }

    const { data: alreadyReviewed } = await supabase
      .from("product_reviews")
      .select("order_id")
      .eq("product_id", parsed.data.product_id)
      .in("order_id", deliveredIds);
    const reviewedIds = new Set((alreadyReviewed ?? []).map((row) => row.order_id as string));
    const orderId = deliveredIds.find((id) => !reviewedIds.has(id));

    if (!orderId) {
      return NextResponse.json(
        { error: "You've already reviewed this product for every order you've received." },
        { status: 409 },
      );
    }

    const { error: insertError } = await supabase.from("product_reviews").insert({
      product_id: parsed.data.product_id,
      store_id: product.store_id,
      order_id: orderId,
      reviewer_name: deriveDisplayName(user.full_name, user.email),
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "This order has already been reviewed." }, { status: 409 });
      }
      logDevError("reviews.product.create", insertError, { productId: parsed.data.product_id });
      return NextResponse.json({ error: "Could not submit product review." }, { status: 500 });
    }

    await refreshProductRating(parsed.data.product_id);

    // Reviewing a product also confirms the buyer received the order.
    await supabase
      .from("orders")
      .update({ buyer_confirmed_at: new Date().toISOString(), buyer_confirmed_via: "review" })
      .eq("id", orderId)
      .is("buyer_confirmed_at", null);

    return NextResponse.json({ ok: true, message: "Product review submitted." });
  } catch (error) {
    logDevError("reviews.product.create.unhandled", error);
    return NextResponse.json({ error: "Unexpected product review create error." }, { status: 500 });
  }
}
