import type { Metadata } from "next";
import Link from "next/link";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { LocationFilterButton } from "@/components/marketplace/location-filter-button";
import { haversineDistanceKm } from "@/lib/geo";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Marketplace",
};

type MarketplacePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: "latest" | "price_asc" | "price_desc" | "distance";
    min_price?: string;
    max_price?: string;
    lat?: string;
    lng?: string;
    radius_km?: string;
  }>;
};

type StoreLite = {
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

type ProductLite = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  rating_avg: number | null;
  rating_count: number;
  stock_count: number;
  created_at: string;
};

type SearchState = {
  q: string;
  category: string;
  sort: "latest" | "price_asc" | "price_desc" | "distance";
  min_price: number | null;
  max_price: number | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
};

const DEFAULT_RADIUS_KM = 25;

function parseNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSearchState(raw: Awaited<MarketplacePageProps["searchParams"]>): SearchState {
  const sortValues = ["latest", "price_asc", "price_desc", "distance"] as const;
  const sort = sortValues.includes((raw.sort ?? "latest") as (typeof sortValues)[number])
    ? (raw.sort as SearchState["sort"]) ?? "latest"
    : "latest";

  const radius = parseNumber(raw.radius_km);

  return {
    q: raw.q?.trim() ?? "",
    category: raw.category?.trim() ?? "",
    sort,
    min_price: parseNumber(raw.min_price),
    max_price: parseNumber(raw.max_price),
    lat: parseNumber(raw.lat),
    lng: parseNumber(raw.lng),
    radius_km: radius && radius > 0 ? Math.min(radius, 200) : DEFAULT_RADIUS_KM,
  };
}

async function getMarketplaceResults(state: SearchState) {
  const supabase = createAdminSupabaseClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, slug, city, state, country, logo_url, rating_avg, rating_count, latitude, longitude")
    .eq("is_active", true)
    .limit(500);

  const typedStores = ((stores ?? []) as StoreLite[]);
  const storesById = new Map(typedStores.map((store) => [store.id, store]));
  const activeStoreIds = [...storesById.keys()];

  if (activeStoreIds.length === 0) {
    return {
      products: [] as Array<ProductLite & { distance_km: number | null; store: StoreLite }>,
      categories: [] as string[],
    };
  }

  let productsQuery = supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
    .eq("is_available", true)
    .in("store_id", activeStoreIds)
    .order("created_at", { ascending: false })
    .limit(1200);

  if (state.category) {
    productsQuery = productsQuery.eq("category", state.category);
  }

  if (state.q) {
    const safeQ = state.q.replace(/,/g, " ");
    productsQuery = productsQuery.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
  }

  const [{ data: products }, { data: categoryRows }] = await Promise.all([
    productsQuery,
    supabase
      .from("products")
      .select("category")
      .eq("is_available", true)
      .not("category", "is", null)
      .limit(200),
  ]);

  const categories = [
    ...new Set(
      (categoryRows ?? [])
        .map((row) => String(row.category ?? "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const filtered = ((products ?? []) as ProductLite[])
    .map((product) => {
      const store = storesById.get(product.store_id);
      if (!store) return null;

      let distanceKm: number | null = null;
      if (
        state.lat !== null &&
        state.lng !== null &&
        store.latitude !== null &&
        store.longitude !== null
      ) {
        distanceKm = haversineDistanceKm(
          state.lat,
          state.lng,
          Number(store.latitude),
          Number(store.longitude),
        );
      }

      return { ...product, store, distance_km: distanceKm };
    })
    .filter((product): product is ProductLite & { distance_km: number | null; store: StoreLite } => product !== null)
    .filter((product) => {
      const price = Number(product.price);
      if (state.min_price !== null && price < state.min_price) return false;
      if (state.max_price !== null && price > state.max_price) return false;

      if (state.lat !== null && state.lng !== null) {
        if (product.distance_km === null) return false;
        if (product.distance_km > state.radius_km) return false;
      }

      return true;
    });

  filtered.sort((a, b) => {
    if (state.sort === "price_asc") return Number(a.price) - Number(b.price);
    if (state.sort === "price_desc") return Number(b.price) - Number(a.price);
    if (state.sort === "distance") {
      if (a.distance_km === null && b.distance_km === null) return 0;
      if (a.distance_km === null) return 1;
      if (b.distance_km === null) return -1;
      return a.distance_km - b.distance_km;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return { products: filtered.slice(0, 72), categories };
}

function StoreLocation({ store }: { store: StoreLite }) {
  const location = [store.city, store.state, store.country].filter(Boolean).join(", ");
  return <p className="line-clamp-1 text-xs text-slate-500">{location || "Location not set"}</p>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const state = parseSearchState(await searchParams);
  const { products, categories } = await getMarketplaceResults(state);
  const hasLocationFilter = state.lat !== null && state.lng !== null;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-2 py-6 sm:px-3 lg:py-8">
      <header className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Marketplace
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
              Discover Products from Nearby Vendors
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back Home
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <form action="/marketplace" className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Search</label>
              <input
                name="q"
                defaultValue={state.q}
                placeholder="Product name..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Category</label>
              <select
                name="category"
                defaultValue={state.category}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 focus:ring-2"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Min price</label>
                <input
                  name="min_price"
                  type="number"
                  min="0"
                  defaultValue={state.min_price ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 focus:ring-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Max price</label>
                <input
                  name="max_price"
                  type="number"
                  min="0"
                  defaultValue={state.max_price ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 focus:ring-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Sort</label>
              <select
                name="sort"
                defaultValue={state.sort}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 focus:ring-2"
              >
                <option value="latest">Latest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="distance">Distance</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Radius (km)</label>
              <input
                name="radius_km"
                type="number"
                min="1"
                max="200"
                defaultValue={state.radius_km}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 focus:ring-2"
              />
            </div>

            <input type="hidden" name="lat" value={state.lat ?? ""} />
            <input type="hidden" name="lng" value={state.lng ?? ""} />

            <button
              type="submit"
              className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Apply filters
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <LocationFilterButton radiusKm={state.radius_km} />
            {hasLocationFilter ? (
              <p className="mt-3 text-xs text-emerald-700">
                Location filter active at {state.radius_km} km radius.
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Enable location to prioritize nearby stores.
              </p>
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">Products</h2>
            <p className="text-sm text-slate-600">{products.length} results</p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              No products match your current filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-2 [@media(max-width:320px)]:grid-cols-1 sm:gap-3 xl:grid-cols-3">
              {products.map((product) => (
                <div key={product.id} className="w-full max-w-[320px] space-y-2">
                  <ProductShowcaseCard product={product} store={product.store} variant="marketplace" />
                  <div className="px-1">
                    <StoreLocation store={product.store} />
                    {typeof product.distance_km === "number" ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        {product.distance_km.toFixed(1)} km away
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
