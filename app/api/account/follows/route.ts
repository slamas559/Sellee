import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

const followPayloadSchema = z.object({
  store_slug: z.string().min(2).max(120),
});

const unfollowPayloadSchema = z.object({
  store_id: z.string().uuid(),
});

async function getCustomerPhone(userId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user?.phone) {
    return null;
  }

  return normalizeWhatsAppNumber(String(user.phone));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phone = await getCustomerPhone(session.user.id);
  if (!phone) {
    return NextResponse.json({ follows: [] });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("customer_store_follows")
    .select("store_id, stores:store_id(id,name,slug,logo_url,city,state,country,rating_avg,rating_count)")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Could not load follows." }, { status: 500 });
  }

  const follows = (data ?? [])
    .map((row) => {
      const store = (row as { stores?: unknown }).stores as
        | {
            id: string;
            name: string;
            slug: string;
            logo_url: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            rating_avg: number | null;
            rating_count: number | null;
          }
        | null;
      if (!store) return null;
      return store;
    })
    .filter(Boolean);

  return NextResponse.json({ follows });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = followPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const phone = await getCustomerPhone(session.user.id);
  if (!phone) {
    return NextResponse.json(
      { error: "Add your phone number in Account settings to follow stores." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const slug = parsed.data.store_slug.trim().toLowerCase();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id,name,slug,vendor_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  if (String(store.vendor_id) === session.user.id) {
    return NextResponse.json(
      { error: "You cannot follow your own store." },
      { status: 400 },
    );
  }

  const { error: followError } = await supabase.from("customer_store_follows").upsert(
    {
      customer_phone: phone,
      store_id: store.id,
    },
    { onConflict: "customer_phone,store_id" },
  );

  if (followError) {
    return NextResponse.json({ error: "Could not follow store." }, { status: 500 });
  }

  return NextResponse.json({ success: true, store });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = unfollowPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const phone = await getCustomerPhone(session.user.id);
  if (!phone) {
    return NextResponse.json({ success: true });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("customer_store_follows")
    .delete()
    .eq("customer_phone", phone)
    .eq("store_id", parsed.data.store_id);

  if (error) {
    return NextResponse.json({ error: "Could not unfollow store." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
