import { haversineDistanceKm } from "@/lib/geo";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export type StoreSearchParams = {
  q?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  limit?: number;
};

export type StoreRow = {
  id: string;
  vendor_id: string;
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
  whatsapp_verified_at: string | null;
};

export type StoreSearchResult = StoreRow & {
  niche_names: string[];
  follower_count: number;
  distance_km: number | null;
};

export type StoreSearchResponse = {
  stores: StoreSearchResult[];
  meta: {
    count: number;
    radius_km: number;
    has_location_filter: boolean;
  };
};

/**
 * Shared store search implementation. Used by:
 * - app/api/vendors/nearby/route.ts (public "browse vendors" API)
 * - lib/ai/product-assistant.ts (the shopping assistant's search_stores tool)
 *
 * Same principle as searchProducts: one query, one place, so the AI can
 * never surface a store a normal visitor couldn't already find on /vendors.
 */
export async function searchStores(params: StoreSearchParams): Promise<StoreSearchResponse> {
  const { q, category, lat, lng, radius_km = 25, limit = 24 } = params;

  const supabase = createAdminSupabaseClient();

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select(
      "id, vendor_id, name, slug, logo_url, city, state, country, latitude, longitude, theme_color, rating_avg, rating_count, whatsapp_verified_at",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (storesError) {
    logDevError("store-search.stores", storesError);
    throw new Error("Could not load stores.");
  }

  const typedStores = (stores as StoreRow[] | null) ?? [];
  const storeIds = typedStores.map((store) => store.id);

  const nichesByStoreId = new Map<string, string[]>();
  const followerCountByStoreId = new Map<string, number>();

  if (storeIds.length > 0) {
    const { data: storeNiches, error: storeNichesError } = await supabase
      .from("store_niches")
      .select("store_id, niche:niche_id(name)")
      .in("store_id", storeIds);

    if (storeNichesError) {
      logDevError("store-search.niches", storeNichesError);
    } else {
      for (const row of (storeNiches ?? []) as Array<{
        store_id: string;
        niche?: { name?: string } | null;
      }>) {
        const nicheName = row.niche?.name?.trim();
        if (!nicheName) continue;
        const current = nichesByStoreId.get(row.store_id) ?? [];
        current.push(nicheName);
        nichesByStoreId.set(row.store_id, current);
      }
    }

    const { data: followsData, error: followsError } = await supabase
      .from("customer_store_follows")
      .select("store_id")
      .in("store_id", storeIds);

    if (followsError) {
      logDevError("store-search.follows", followsError);
    } else {
      for (const row of (followsData ?? []) as Array<{ store_id: string }>) {
        followerCountByStoreId.set(row.store_id, (followerCountByStoreId.get(row.store_id) ?? 0) + 1);
      }
    }
  }

  let allowedStoreIds: Set<string> | null = null;
  if (category) {
    const { data: categoryProducts, error: categoryError } = await supabase
      .from("products")
      .select("store_id")
      .eq("is_available", true)
      .eq("category", category);

    if (categoryError) {
      logDevError("store-search.category", categoryError, { category });
      throw new Error("Could not filter vendors by category.");
    }

    allowedStoreIds = new Set((categoryProducts ?? []).map((row) => String(row.store_id)));
  }

  const qLower = q?.toLowerCase() ?? null;
  const hasLocationFilter = typeof lat === "number" && typeof lng === "number";

  const results = typedStores
    .filter((store) => {
      if (allowedStoreIds && !allowedStoreIds.has(store.id)) return false;
      if (!qLower) return true;

      const searchText = `${store.name} ${store.city ?? ""} ${store.state ?? ""} ${store.country ?? ""}`.toLowerCase();
      return searchText.includes(qLower);
    })
    .map((store) => {
      let distanceKm: number | null = null;
      if (hasLocationFilter && store.latitude !== null && store.longitude !== null) {
        distanceKm = haversineDistanceKm(lat as number, lng as number, Number(store.latitude), Number(store.longitude));
      }

      return {
        ...store,
        niche_names: Array.from(new Set(nichesByStoreId.get(store.id) ?? [])),
        follower_count: followerCountByStoreId.get(store.id) ?? 0,
        distance_km: distanceKm,
      };
    })
    .filter((store) => {
      if (!hasLocationFilter) return true;
      return store.distance_km !== null && store.distance_km <= radius_km;
    })
    .sort((a, b) => {
      if (a.distance_km === null && b.distance_km === null) return 0;
      if (a.distance_km === null) return 1;
      if (b.distance_km === null) return -1;
      return a.distance_km - b.distance_km;
    })
    .slice(0, limit);

  return {
    stores: results,
    meta: { count: results.length, radius_km, has_location_filter: hasLocationFilter },
  };
}
