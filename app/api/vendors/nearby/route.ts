import { NextResponse } from "next/server";
import { z } from "zod";
import { haversineDistanceKm } from "@/lib/geo";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().min(1).max(200).default(25),
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  theme_color: string | null;
  rating_avg: number;
  rating_count: number;
};

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = nearbyQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid nearby query params." }, { status: 400 });
    }

    const { lat, lng, radius_km, q, category, limit } = parsed.data;
    const supabase = createAdminSupabaseClient();

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select(
        "id, name, slug, logo_url, city, state, country, latitude, longitude, theme_color, rating_avg, rating_count",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);

    if (storesError) {
      logDevError("vendors.nearby.stores", storesError);
      return NextResponse.json({ error: "Could not load vendors." }, { status: 500 });
    }

    let allowedStoreIds: Set<string> | null = null;
    if (category) {
      const { data: categoryProducts, error: categoryError } = await supabase
        .from("products")
        .select("store_id")
        .eq("is_available", true)
        .eq("category", category);

      if (categoryError) {
        logDevError("vendors.nearby.category", categoryError, { category });
        return NextResponse.json({ error: "Could not filter vendors by category." }, { status: 500 });
      }

      allowedStoreIds = new Set((categoryProducts ?? []).map((row) => String(row.store_id)));
    }

    const qLower = q?.toLowerCase() ?? null;

    const vendors = (stores as VendorRow[] | null ?? [])
      .filter((store) => {
        if (allowedStoreIds && !allowedStoreIds.has(store.id)) {
          return false;
        }

        if (!qLower) {
          return true;
        }

        const searchText = `${store.name} ${store.city ?? ""} ${store.state ?? ""} ${store.country ?? ""}`.toLowerCase();
        return searchText.includes(qLower);
      })
      .map((store) => {
        let distanceKm: number | null = null;

        if (
          typeof lat === "number" &&
          typeof lng === "number" &&
          store.latitude !== null &&
          store.longitude !== null
        ) {
          distanceKm = haversineDistanceKm(lat, lng, Number(store.latitude), Number(store.longitude));
        }

        return {
          ...store,
          distance_km: distanceKm,
        };
      })
      .filter((store) => {
        if (typeof lat !== "number" || typeof lng !== "number") {
          return true;
        }

        return store.distance_km !== null && store.distance_km <= radius_km;
      })
      .sort((a, b) => {
        if (a.distance_km === null && b.distance_km === null) return 0;
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      })
      .slice(0, limit);

    return NextResponse.json({
      vendors,
      meta: {
        count: vendors.length,
        radius_km: radius_km,
        has_location_filter: typeof lat === "number" && typeof lng === "number",
      },
    });
  } catch (error) {
    logDevError("vendors.nearby.unhandled", error);
    return NextResponse.json({ error: "Unexpected nearby vendors error." }, { status: 500 });
  }
}
