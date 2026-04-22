import { NextResponse } from "next/server";
import { z } from "zod";
import { haversineDistanceKm } from "@/lib/geo";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(50).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().min(1).max(200).default(25),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort: z.enum(["latest", "price_asc", "price_desc", "distance"]).default("latest"),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

type StoreLookup = {
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

type ProductRow = {
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

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = searchQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product search query params." }, { status: 400 });
    }

    const {
      q,
      category,
      lat,
      lng,
      radius_km,
      min_price,
      max_price,
      sort,
      limit,
    } = parsed.data;

    if (
      typeof min_price === "number" &&
      typeof max_price === "number" &&
      min_price > max_price
    ) {
      return NextResponse.json({ error: "min_price cannot be greater than max_price." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    const { data: activeStores, error: storesError } = await supabase
      .from("stores")
      .select("id, name, slug, city, state, country, logo_url, rating_avg, rating_count, latitude, longitude")
      .eq("is_active", true)
      .limit(500);

    if (storesError) {
      logDevError("products.search.stores", storesError);
      return NextResponse.json({ error: "Could not load stores for product search." }, { status: 500 });
    }

    const storesById = new Map<string, StoreLookup>();
    for (const store of (activeStores as StoreLookup[] | null) ?? []) {
      storesById.set(store.id, store);
    }

    const allStoreIds = [...storesById.keys()];
    if (allStoreIds.length === 0) {
      return NextResponse.json({ products: [], meta: { count: 0 } });
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
      .eq("is_available", true)
      .in("store_id", allStoreIds)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (productsError) {
      logDevError("products.search.products", productsError);
      return NextResponse.json({ error: "Could not load products for search." }, { status: 500 });
    }

    const qLower = q?.toLowerCase() ?? null;
    const normalizedCategory = category?.toLowerCase() ?? null;

    const filtered = ((products as ProductRow[] | null) ?? [])
      .map((product) => {
        const store = storesById.get(product.store_id);
        if (!store) {
          return null;
        }

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
          ...product,
          store,
          distance_km: distanceKm,
        };
      })
      .filter((product): product is NonNullable<typeof product> => product !== null)
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

        if (typeof lat === "number" && typeof lng === "number") {
          if (product.distance_km === null || product.distance_km > radius_km) {
            return false;
          }
        }

        if (!qLower) {
          return true;
        }

        const searchText = `${product.name} ${product.description ?? ""} ${product.category ?? ""} ${product.store.name}`.toLowerCase();
        return searchText.includes(qLower);
      });

    const sorted = filtered.sort((a, b) => {
      if (sort === "price_asc") {
        return Number(a.price) - Number(b.price);
      }

      if (sort === "price_desc") {
        return Number(b.price) - Number(a.price);
      }

      if (sort === "distance") {
        if (a.distance_km === null && b.distance_km === null) return 0;
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const results = sorted.slice(0, limit);

    return NextResponse.json({
      products: results,
      meta: {
        count: results.length,
        radius_km,
        has_location_filter: typeof lat === "number" && typeof lng === "number",
      },
    });
  } catch (error) {
    logDevError("products.search.unhandled", error);
    return NextResponse.json({ error: "Unexpected product search error." }, { status: 500 });
  }
}
