import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const createVendorReviewSchema = z.object({
  store_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(600).optional().or(z.literal("")),
});

const querySchema = z.object({
  store_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

async function refreshVendorRating(storeId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: ratings, error } = await supabase
    .from("vendor_reviews")
    .select("rating")
    .eq("store_id", storeId);

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
    .from("stores")
    .update({ rating_avg: avg, rating_count: count })
    .eq("id", storeId);

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
      return NextResponse.json({ error: "Invalid vendor review query." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: reviews, error } = await supabase
      .from("vendor_reviews")
      .select("id, store_id, reviewer_name, rating, comment, created_at")
      .eq("store_id", parsed.data.store_id)
      .order("created_at", { ascending: false })
      .limit(parsed.data.limit);

    if (error) {
      logDevError("reviews.vendor.get", error, { storeId: parsed.data.store_id });
      return NextResponse.json({ error: "Could not load vendor reviews." }, { status: 500 });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("rating_avg, rating_count")
      .eq("id", parsed.data.store_id)
      .maybeSingle();

    return NextResponse.json({
      reviews: reviews ?? [],
      summary: {
        rating_avg: Number(store?.rating_avg ?? 0),
        rating_count: Number(store?.rating_count ?? 0),
      },
    });
  } catch (error) {
    logDevError("reviews.vendor.get.unhandled", error);
    return NextResponse.json({ error: "Unexpected vendor review error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please log in to submit a vendor review." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createVendorReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid vendor review payload." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError || !user?.email) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("id", parsed.data.store_id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    const { error: insertError } = await supabase.from("vendor_reviews").insert({
      store_id: parsed.data.store_id,
      reviewer_name: deriveDisplayName(user.full_name, user.email),
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    });

    if (insertError) {
      logDevError("reviews.vendor.create", insertError, { storeId: parsed.data.store_id });
      return NextResponse.json({ error: "Could not submit vendor review." }, { status: 500 });
    }

    await refreshVendorRating(parsed.data.store_id);
    return NextResponse.json({ ok: true, message: "Vendor review submitted." });
  } catch (error) {
    logDevError("reviews.vendor.create.unhandled", error);
    return NextResponse.json({ error: "Unexpected vendor review create error." }, { status: 500 });
  }
}
