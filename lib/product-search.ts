import { haversineDistanceKm } from "@/lib/geo";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export type ProductSearchParams = {
  q?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  min_price?: number;
  max_price?: number;
  sort?: "latest" | "price_asc" | "price_desc" | "distance";
  limit?: number;
};

export type StoreLookup = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number;
  latitude: number | null;
  longitude: number | null;
};

export type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  rating_avg: number;
  rating_count: number;
  stock_count: number;
  created_at: string;
};

export type ProductSearchResult = ProductRow & {
  store: StoreLookup;
  distance_km: number | null;
};

export type ProductSearchResponse = {
  products: ProductSearchResult[];
  meta: {
    count: number;
    radius_km: number;
    has_location_filter: boolean;
  };
};

/**
 * Shared product search implementation. Used by:
 * - app/api/products/search/route.ts (public search API)
 * - lib/ai/product-assistant.ts (the shopping assistant's search_products tool)
 *
 * Keeping this in one place means the AI can never see or return anything
 * a normal marketplace visitor couldn't already find through the regular
 * search UI - it's the exact same query, exact same `is_available` /
 * `is_active` filters, just invoked from a different entry point.
 */
export async function searchProducts(
  params: ProductSearchParams,
): Promise<ProductSearchResponse> {
  const {
    q,
    category,
    lat,
    lng,
    radius_km = 25,
    min_price,
    max_price,
    sort = "latest",
    limit = 24,
  } = params;

  const supabase = createAdminSupabaseClient();

  const { data: activeStores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, city, state, country, logo_url, rating_avg, rating_count, latitude, longitude")
    .eq("is_active", true)
    .limit(500);

  if (storesError) {
    logDevError("product-search.stores", storesError);
    throw new Error("Could not load stores for product search.");
  }

  const storesById = new Map<string, StoreLookup>();
  for (const store of (activeStores as StoreLookup[] | null) ?? []) {
    storesById.set(store.id, store);
  }

  const allStoreIds = [...storesById.keys()];
  if (allStoreIds.length === 0) {
    return { products: [], meta: { count: 0, radius_km, has_location_filter: false } };
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
    .eq("is_available", true)
    .in("store_id", allStoreIds)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (productsError) {
    logDevError("product-search.products", productsError);
    throw new Error("Could not load products for search.");
  }

  const qLower = q?.toLowerCase() ?? null;
  const normalizedCategory = category?.toLowerCase() ?? null;
  const hasLocationFilter = typeof lat === "number" && typeof lng === "number";

  const filtered = ((products as ProductRow[] | null) ?? [])
    .map((product) => {
      const store = storesById.get(product.store_id);
      if (!store) return null;

      let distanceKm: number | null = null;
      if (hasLocationFilter && store.latitude !== null && store.longitude !== null) {
        distanceKm = haversineDistanceKm(lat as number, lng as number, Number(store.latitude), Number(store.longitude));
      }

      return { ...product, store, distance_km: distanceKm };
    })
    .filter((product): product is ProductSearchResult => product !== null)
    .filter((product) => {
      if (normalizedCategory && (product.category ?? "").toLowerCase() !== normalizedCategory) {
        return false;
      }
      if (typeof min_price === "number" && Number(product.price) < min_price) {
        return false;
      }
      if (typeof max_price === "number" && Number(product.price) > max_price) {
        return false;
      }
      if (hasLocationFilter) {
        if (product.distance_km === null || product.distance_km > radius_km) {
          return false;
        }
      }
      if (!qLower) return true;

      const searchText = `${product.name} ${product.description ?? ""} ${product.category ?? ""} ${product.store.name}`.toLowerCase();
      return searchText.includes(qLower);
    });

  const sorted = filtered.sort((a, b) => {
    if (sort === "price_asc") return Number(a.price) - Number(b.price);
    if (sort === "price_desc") return Number(b.price) - Number(a.price);
    if (sort === "distance") {
      if (a.distance_km === null && b.distance_km === null) return 0;
      if (a.distance_km === null) return 1;
      if (b.distance_km === null) return -1;
      return a.distance_km - b.distance_km;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const results = sorted.slice(0, limit);

  return {
    products: results,
    meta: { count: results.length, radius_km, has_location_filter: hasLocationFilter },
  };
}