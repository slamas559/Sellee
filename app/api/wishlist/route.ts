import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  const supabase = createAdminSupabaseClient();

  if (productId) {
    const { data, error } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("product_id", productId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exists: !!data });
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select(`product_id, products(id, name, slug, price, image_url, store_id, rating_avg, rating_count), stores:products!inner(store_id)(id,name,slug,logo_url,rating_avg,rating_count)`)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const productId = body?.productId;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ exists: true });
  }

  const { error } = await supabase.from("wishlists").insert({
    user_id: session.user.id,
    product_id: productId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", session.user.id)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
