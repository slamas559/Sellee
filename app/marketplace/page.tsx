import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { LocationFilterButton } from "@/components/marketplace/location-filter-button";
import { formatNaira } from "@/lib/format";
import { haversineDistanceKm } from "@/lib/geo";
import {
  getMarketplaceBaseDataCached,
  getMarketplaceProductsByStoreIdsCached,
  getMarketplaceStoreNichesCached,
} from "@/lib/public-cache";
 
import { FilterButton } from "@/components/marketplace/filter-button";
import MarketplaceFilterForm from "@/components/marketplace/marketplace-filter-form";

export const metadata: Metadata = {
  title: "Marketplace",
};

type MarketplacePageProps = {
  searchParams: Promise<{
    q?: string;
    niche?: string;
    category?: string;
    sort?: "latest" | "price_asc" | "price_desc" | "distance";
    min_price?: string;
    max_price?: string;
    lat?: string;
    lng?: string;
    loc?: string;
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

type NicheLite = {
  id: string;
  slug: string;
  name: string;
};

type NicheCategoryLite = {
  niche_id: string;
  name: string;
};

type CategoryGroup = {
  niche_id: string;
  niche_name: string;
  categories: string[];
};

type SearchState = {
  q: string;
  niche: string;
  category: string;
  sort: "latest" | "price_asc" | "price_desc" | "distance";
  min_price: number | null;
  max_price: number | null;
  lat: number | null;
  lng: number | null;
  loc: string;
  radius_km: number;
};

const DEFAULT_RADIUS_KM = 25;
const SORT_LABELS: Record<SearchState["sort"], string> = {
  latest: "Latest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  distance: "Distance",
};

function parseNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSearchState(raw: Awaited<MarketplacePageProps["searchParams"]>): SearchState {
  const sortValues = ["latest", "price_asc", "price_desc", "distance"] as const;
  const sort = sortValues.includes((raw.sort ?? "latest") as (typeof sortValues)[number])
    ? (raw.sort as SearchState["sort"]) ?? "latest"
    : "latest";

  const radius = parseNumber(raw.radius_km);

  return {
    q: raw.q?.trim() ?? "",
    niche: raw.niche?.trim() ?? "",
    category: raw.category?.trim() ?? "",
    sort,
    min_price: parseNumber(raw.min_price),
    max_price: parseNumber(raw.max_price),
    lat: parseNumber(raw.lat),
    lng: parseNumber(raw.lng),
    loc: raw.loc?.trim() ?? "",
    radius_km: radius && radius > 0 ? Math.min(radius, 200) : DEFAULT_RADIUS_KM,
  };
}

export async function getMarketplaceResults(state: SearchState) {
  const { stores, niches, nicheCategories } = await getMarketplaceBaseDataCached();
  const typedStores = stores as StoreLite[];
  const storesById = new Map(typedStores.map((store) => [store.id, store]));
  const activeStoreIds = [...storesById.keys()];
  const storeNicheNamesByStoreId = new Map<string, string[]>();
  const storeNicheIdsByStoreId = new Map<string, string[]>();

  const typedNiches = niches as NicheLite[];
  const typedNicheCategories = nicheCategories as NicheCategoryLite[];
  const categoriesByNicheId = new Map<string, string[]>();
  for (const row of typedNicheCategories) {
    const categoryName = row.name?.trim();
    if (!categoryName) continue;
    const current = categoriesByNicheId.get(row.niche_id) ?? [];
    current.push(categoryName);
    categoriesByNicheId.set(row.niche_id, current);
  }

  const groupedCategories: CategoryGroup[] = typedNiches.map((niche) => ({
    niche_id: niche.id,
    niche_name: niche.name,
    categories: Array.from(new Set(categoriesByNicheId.get(niche.id) ?? [])).sort((a, b) =>
      a.localeCompare(b),
    ),
  }));

  const selectedNicheGroup =
    groupedCategories.find((group) => group.niche_id === state.niche) ?? null;
  const categoriesInSelectedNiche = selectedNicheGroup?.categories ?? [];

  if (activeStoreIds.length > 0) {
    const storeNichesData = await getMarketplaceStoreNichesCached(activeStoreIds);
    for (const row of storeNichesData) {
      const nicheIds = storeNicheIdsByStoreId.get(row.store_id) ?? [];
      nicheIds.push(row.niche_id);
      storeNicheIdsByStoreId.set(row.store_id, nicheIds);

      const nicheName = row.niche?.name?.trim();
      if (!nicheName) continue;
      const nicheNames = storeNicheNamesByStoreId.get(row.store_id) ?? [];
      nicheNames.push(nicheName);
      storeNicheNamesByStoreId.set(row.store_id, nicheNames);
    }
  }

  if (activeStoreIds.length === 0) {
    return {
      products: [] as Array<ProductLite & { distance_km: number | null; store: StoreLite }>,
      categories: [] as string[],
      grouped_categories: groupedCategories,
    };
  }

  if (state.niche && categoriesInSelectedNiche.length === 0) {
    return {
      products: [] as Array<ProductLite & { distance_km: number | null; store: StoreLite }>,
      categories: [] as string[],
      grouped_categories: groupedCategories,
    };
  }
  const products = await getMarketplaceProductsByStoreIdsCached(
    activeStoreIds,
    state.category,
    state.niche ? categoriesInSelectedNiche : [],
  );
  const categories = Array.from(new Set((
    state.niche && selectedNicheGroup ? selectedNicheGroup.categories : groupedCategories.flatMap((group) => group.categories)
  ).filter(Boolean)));

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

  const qLower = state.q.trim().toLowerCase();
  const matchedNicheIds = qLower
    ? new Set(
        typedNiches
          .filter(
            (niche) =>
              niche.name.toLowerCase().includes(qLower) || niche.slug.toLowerCase().includes(qLower),
          )
          .map((niche) => niche.id),
      )
    : new Set<string>();
  const matchedCategoryNames = qLower
    ? new Set(
        typedNicheCategories
          .filter((row) => row.name.toLowerCase().includes(qLower))
          .map((row) => row.name.toLowerCase()),
      )
    : new Set<string>();

  const qFiltered = qLower
    ? filtered.filter((product) => {
        const productName = product.name.toLowerCase();
        const description = (product.description ?? "").toLowerCase();
        const category = (product.category ?? "").toLowerCase();
        const storeLocation = [
          product.store.city,
          product.store.state,
          product.store.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const storeName = product.store.name.toLowerCase();

        if (
          productName.includes(qLower) ||
          description.includes(qLower) ||
          category.includes(qLower) ||
          storeLocation.includes(qLower) ||
          storeName.includes(qLower)
        ) {
          return true;
        }

        if (category && matchedCategoryNames.has(category)) {
          return true;
        }

        const storeNicheNames = (storeNicheNamesByStoreId.get(product.store_id) ?? []).map((name) =>
          name.toLowerCase(),
        );
        if (storeNicheNames.some((name) => name.includes(qLower))) {
          return true;
        }

        const storeNicheIds = storeNicheIdsByStoreId.get(product.store_id) ?? [];
        if (storeNicheIds.some((id) => matchedNicheIds.has(id))) {
          return true;
        }

        return false;
      })
    : filtered;

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

  return {
    products: qFiltered.slice(0, 72),
    categories,
    grouped_categories: groupedCategories,
  };
}

function StoreLocation({
  store,
}: {
  store: Pick<StoreLite, "city" | "state" | "country">;
}) {
  const location = [store.city, store.state, store.country].filter(Boolean).join(", ");
  return <p className="line-clamp-1 text-xs text-slate-500">{location || "Location not set"}</p>;
}

function buildMarketplaceHref(
  state: SearchState,
  updates: Partial<{
    q: string;
    niche: string;
    category: string;
    sort: SearchState["sort"];
    min_price: number | null;
    max_price: number | null;
    lat: number | null;
    lng: number | null;
    loc: string;
    radius_km: number;
  }>,
) {
  const nextState = {
    ...state,
    ...updates,
  };
  const params = new URLSearchParams();
  if (nextState.q) params.set("q", nextState.q);
  if (nextState.niche) params.set("niche", nextState.niche);
  if (nextState.category) params.set("category", nextState.category);
  if (nextState.sort && nextState.sort !== "latest") params.set("sort", nextState.sort);
  if (nextState.min_price !== null) params.set("min_price", String(nextState.min_price));
  if (nextState.max_price !== null) params.set("max_price", String(nextState.max_price));
  if (nextState.lat !== null) params.set("lat", String(nextState.lat));
  if (nextState.lng !== null) params.set("lng", String(nextState.lng));
  if (nextState.loc) params.set("loc", nextState.loc);
  if (nextState.radius_km !== DEFAULT_RADIUS_KM) params.set("radius_km", String(nextState.radius_km));

  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const state = parseSearchState(await searchParams);
  const { products, categories, grouped_categories } = await getMarketplaceResults(state);
  const hasLocationFilter = state.lat !== null && state.lng !== null;

  const activeFilters: Array<{ label: string; clearHref: string }> = [];
  if (state.q) {
    activeFilters.push({
      label: `Search: ${state.q}`,
      clearHref: buildMarketplaceHref(state, { q: "" }),
    });
  }
  if (state.niche) {
    const matchedNiche = grouped_categories.find((group) => group.niche_id === state.niche);
    activeFilters.push({
      label: `Niche: ${matchedNiche?.niche_name ?? "Selected"}`,
      clearHref: buildMarketplaceHref(state, { niche: "", category: "" }),
    });
  }
  if (state.category) {
    activeFilters.push({
      label: `Category: ${state.category}`,
      clearHref: buildMarketplaceHref(state, { category: "" }),
    });
  }
  if (state.min_price !== null || state.max_price !== null) {
    const min = state.min_price !== null ? formatNaira(state.min_price) : "Any";
    const max = state.max_price !== null ? formatNaira(state.max_price) : "Any";
    activeFilters.push({
      label: `Price: ${min} - ${max}`,
      clearHref: buildMarketplaceHref(state, { min_price: null, max_price: null }),
    });
  }
  if (state.sort !== "latest") {
    activeFilters.push({
      label: `Sort: ${SORT_LABELS[state.sort]}`,
      clearHref: buildMarketplaceHref(state, { sort: "latest" }),
    });
  }
  if (hasLocationFilter) {
    activeFilters.push({
      label: state.loc ? `Near ${state.loc} (${state.radius_km} km)` : `Near me (${state.radius_km} km)`,
      clearHref: buildMarketplaceHref(state, { lat: null, lng: null, loc: "" }),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-2 py-6 sm:px-3 lg:py-8">
      <header className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Marketplace</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Discover Products from Nearby Vendors</h1>
          </div>
          <Link href="/" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back Home</Link>
        </div>
      </header>

      {/* mobile device filter */}
      <FilterButton state={state} categories={categories} grouped_categories={grouped_categories} hasLocationFilter={hasLocationFilter} activeFilters={activeFilters.map((f) => f.label)} />

        {/* bigger screen filter */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="sticky top-25 hidden h-fit rounded-3xl border border-emerald-200/80 bg-white/90 p-5 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.35)] backdrop-blur lg:block">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M3 5h18" />
                <path d="M6 12h12" />
                <path d="M10 19h4" />
              </svg>
              Smart Filters
            </p>
            <p className="mt-1 text-sm text-slate-600">Refine results by category, price, and location.</p>
          </div>
          <MarketplaceFilterForm state={state} categories={categories} groupedCategories={grouped_categories}
            hasLocationFilter={hasLocationFilter} />
        </aside>

        <section className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-900">Products</h2>
            <p className="text-sm text-slate-600">{products.length} results</p>
          </div>

          {activeFilters.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Link key={filter.label} href={filter.clearHref} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100" title={`Clear ${filter.label}`}>
                  <span>{filter.label}</span>
                  <span aria-hidden="true">x</span>
                </Link>
              ))}
              <Link href="/marketplace" className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">Clear all</Link>
            </div>
          ) : null}

          {products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No products match your current filters.</div>
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-2 [@media(max-width:320px)]:grid-cols-1 sm:gap-3 xl:grid-cols-3">
              {products.map((product) => (
                <div key={product.id} className="w-full max-w-[320px] space-y-2">
                  <ProductShowcaseCard product={product} store={product.store} variant="marketplace" />
                  <div className="px-1">
                    <StoreLocation store={product.store} />
                    {typeof product.distance_km === "number" ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">{product.distance_km.toFixed(1)} km away</p>
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
