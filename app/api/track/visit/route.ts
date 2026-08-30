import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const VISITOR_COOKIE = "sellee_vid";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const bodySchema = z.object({
  storeId: z.string().uuid(),
  path: z.string().max(500),
  referrer: z.string().max(500).nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
});

const BOT_UA_PATTERN = /bot|crawler|spider|crawling|facebookexternalhit|whatsapp\/|slackbot|bingpreview|headless/i;

function classifySource(referrer: string | null | undefined): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("whatsapp")) return "whatsapp";
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("google")) return "google";
    if (host.includes("bing")) return "bing";
    if (host.includes("duckduckgo")) return "duckduckgo";
    if (host.includes("facebook") || host.includes("instagram")) return "meta";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("sellee.store")) return "sellee";
    return "other";
  } catch {
    return "other";
  }
}

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA_PATTERN.test(userAgent)) {
    // Don't log crawler/preview-bot traffic as a real visit.
    return NextResponse.json({ tracked: false }, { status: 202 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, vendor_id")
    .eq("id", parsed.data.storeId)
    .maybeSingle();

  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  // Don't count the vendor's own visits to their own store.
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.id === store.vendor_id) {
    return NextResponse.json({ tracked: false }, { status: 202 });
  }

  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  const isNewVisitor = !visitorId;
  if (!visitorId) {
    visitorId = randomUUID();
  }

  let productId: string | null = null;
  if (parsed.data.productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", parsed.data.productId)
      .eq("store_id", store.id)
      .maybeSingle();
    // Silently drop a product id that doesn't belong to this store rather than erroring —
    // still record the store visit itself.
    productId = product?.id ?? null;
  }

  const { error } = await supabase.from("store_visits").insert({
    store_id: store.id,
    visitor_id: visitorId,
    path: parsed.data.path,
    referrer: parsed.data.referrer || null,
    source: classifySource(parsed.data.referrer),
    product_id: productId,
  });

  if (error) {
    return NextResponse.json({ error: "Could not record visit." }, { status: 500 });
  }

  const response = NextResponse.json({ tracked: true }, { status: 201 });
  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: VISITOR_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}