import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { slugify } from "@/lib/format";

export const CACHE_TAGS = {
  homeMarketplaceBase: "home-marketplace-base",
  storeNichesFollowers: "store-niches-followers",
  marketplaceBase: "marketplace-base",
  marketplaceStoreNiches: "marketplace-store-niches",
  marketplaceProducts: "marketplace-products",
  marketplaceStats: "marketplace-stats",
  storefrontPublic: "storefront-public",
  storefrontBySlug: (slug: string) => `storefront:${slug}`,
  nicheLocationPages: "niche-location-pages",
} as const;

export type PublicStoreLite = {
  id: string;
  vendor_id?: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number;
  theme_color?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp_verified_at?: string | null;
  is_verified?: boolean | null;
};

export type PublicProductLite = {
  id: string;
  store_id: string;
  slug?: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  rating_avg: number | null;
  rating_count: number;
  stock_count: number;
  created_at: string;
};

export type PublicNicheLite = {
  id: string;
  slug: string;
  name: string;
};

export type PublicNicheCategoryLite = {
  niche_id: string;
  name: string;
};

export type PublicStoreNicheRow = {
  store_id: string;
  niche_id: string;
  niche?: { name?: string } | null;
};

const getHomeMarketplaceBaseDataInternal = async () => {
  const supabase = createAdminSupabaseClient();

  const [{ data: stores }, { data: products }, { data: categoryRows }, { data: niches }, { data: nicheCategories }] =
    await Promise.all([
      supabase
        .from("stores")
        .select("id, vendor_id, name, slug, city, state, country, logo_url, rating_avg, rating_count, theme_color, whatsapp_verified_at, is_verified")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("products")
        .select("id, store_id, slug, name, description, category, price, compare_at_price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("products")
        .select("category")
        .eq("is_available", true)
        .not("category", "is", null)
        .limit(100),
      supabase.from("niches").select("id, name, slug").order("name", { ascending: true }),
      supabase.from("niche_categories").select("niche_id, name"),
    ]);

  return {
    stores: (stores ?? []) as PublicStoreLite[],
    products: (products ?? []) as PublicProductLite[],
    categoryRows: (categoryRows ?? []) as Array<{ category?: string | null }>,
    niches: (niches ?? []) as Array<{ id: string; name: string; slug: string }>,
    nicheCategories: (nicheCategories ?? []) as PublicNicheCategoryLite[],
  };
};

export const getHomeMarketplaceBaseDataCached = unstable_cache(
  getHomeMarketplaceBaseDataInternal,
  ["home-marketplace-base-v1"],
  { revalidate: 120, tags: [CACHE_TAGS.homeMarketplaceBase] },
);

const getMarketplaceStatsInternal = async () => {
  const supabase = createAdminSupabaseClient();

  // count: "exact", head: true - fetches only the count, not the rows, so
  // this stays cheap even as the catalogue grows well past the 24-row caps
  // used elsewhere on the homepage.
  const [storesResult, productsResult] = await Promise.all([
    supabase.from("stores").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_available", true),
  ]);

  return {
    totalStores: storesResult.count ?? 0,
    totalProducts: productsResult.count ?? 0,
  };
};

export const getMarketplaceStatsCached = unstable_cache(
  getMarketplaceStatsInternal,
  ["marketplace-stats-v1"],
  { revalidate: 300, tags: [CACHE_TAGS.marketplaceStats] },
);

const getStoreNichesAndFollowersInternal = async (storeIds: string[]) => {
  const supabase = createAdminSupabaseClient();
  if (storeIds.length === 0) {
    return {
      storeNiches: [] as PublicStoreNicheRow[],
      follows: [] as Array<{ store_id: string }>,
    };
  }

  const [{ data: storeNiches }, { data: follows }] = await Promise.all([
    supabase
      .from("store_niches")
      .select("store_id, niche_id, niche:niche_id(name)")
      .in("store_id", storeIds),
    supabase.from("customer_store_follows").select("store_id").in("store_id", storeIds),
  ]);

  return {
    storeNiches: (storeNiches ?? []) as PublicStoreNicheRow[],
    follows: (follows ?? []) as Array<{ store_id: string }>,
  };
};

export const getStoreNichesAndFollowersCached = unstable_cache(
  getStoreNichesAndFollowersInternal,
  ["store-niches-followers-v1"],
  { revalidate: 120, tags: [CACHE_TAGS.storeNichesFollowers] },
);

const getMarketplaceBaseDataInternal = async () => {
  const supabase = createAdminSupabaseClient();
  const [{ data: stores }, { data: nichesData }, { data: nicheCategoriesData }] =
    await Promise.all([
      supabase
        .from("stores")
        .select(
          "id, name, slug, city, state, country, logo_url, rating_avg, rating_count, latitude, longitude, whatsapp_verified_at, is_verified",
        )
        .eq("is_active", true)
        .limit(500),
      supabase.from("niches").select("id, slug, name").order("name", { ascending: true }),
      supabase
        .from("niche_categories")
        .select("niche_id, name")
        .order("name", { ascending: true }),
    ]);

  return {
    stores: (stores ?? []) as PublicStoreLite[],
    niches: (nichesData ?? []) as PublicNicheLite[],
    nicheCategories: (nicheCategoriesData ?? []) as PublicNicheCategoryLite[],
  };
};

export const getMarketplaceBaseDataCached = unstable_cache(
  getMarketplaceBaseDataInternal,
  ["marketplace-base-v1"],
  { revalidate: 120, tags: [CACHE_TAGS.marketplaceBase] },
);

const getMarketplaceStoreNichesInternal = async (storeIds: string[]) => {
  const supabase = createAdminSupabaseClient();
  if (storeIds.length === 0) return [] as PublicStoreNicheRow[];
  const { data } = await supabase
    .from("store_niches")
    .select("store_id, niche_id, niche:niche_id(name)")
    .in("store_id", storeIds);
  return (data ?? []) as PublicStoreNicheRow[];
};

export const getMarketplaceStoreNichesCached = unstable_cache(
  getMarketplaceStoreNichesInternal,
  ["marketplace-store-niches-v1"],
  { revalidate: 120, tags: [CACHE_TAGS.marketplaceStoreNiches] },
);

const getMarketplaceProductsByStoreIdsInternal = async (
  storeIds: string[],
  category: string,
  categoriesInSelectedNiche: string[],
) => {
  const supabase = createAdminSupabaseClient();
  if (storeIds.length === 0) return [] as PublicProductLite[];

  let query = supabase
    .from("products")
    .select("id, store_id, slug, name, description, category, price, compare_at_price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
    .eq("is_available", true)
    .in("store_id", storeIds)
    .order("created_at", { ascending: false })
    .limit(1200);

  if (category) {
    query = query.eq("category", category);
  } else if (categoriesInSelectedNiche.length > 0) {
    query = query.in("category", categoriesInSelectedNiche);
  }

  const { data } = await query;
  return (data ?? []) as PublicProductLite[];
};

export const getMarketplaceProductsByStoreIdsCached = unstable_cache(
  getMarketplaceProductsByStoreIdsInternal,
  ["marketplace-products-by-stores-v1"],
  { revalidate: 90, tags: [CACHE_TAGS.marketplaceProducts] },
);

const getStorefrontPublicDataInternal = async (slug: string) => {
  const supabase = createAdminSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at, whatsapp_verified_at, is_verified")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!store) {
    return { store: null, products: [] as PublicProductLite[], nicheNames: [] as string[], completedOrdersCount: 0 };
  }

  const [{ data: products }, { data: storeNiches }, { count: completedOrdersCount }] = await Promise.all([
    supabase
      .from("products")
      .select("id, store_id, slug, name, description, category, price, compare_at_price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at, brand, condition, attributes")
      .eq("store_id", store.id)
      .eq("is_available", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("store_niches")
      .select("niche:niche_id(name)")
      .eq("store_id", store.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("status", "delivered"),
  ]);

  const nicheNames = Array.from(
    new Set(
      ((storeNiches ?? []) as Array<{ niche?: { name?: string } | null }>)
        .map((row) => row.niche?.name?.trim() ?? "")
        .filter(Boolean),
    ),
  );

  return {
    store,
    products: (products ?? []) as PublicProductLite[],
    nicheNames,
    completedOrdersCount: completedOrdersCount ?? 0,
  };
};

export function getStorefrontPublicDataCached(slug: string) {
  return unstable_cache(
    async () => getStorefrontPublicDataInternal(slug),
    ["storefront-public-data-v1", slug],
    {
      revalidate: 120,
      tags: [CACHE_TAGS.storefrontPublic, CACHE_TAGS.storefrontBySlug(slug)],
    },
  )();
}

// ─── Category × location SEO landing pages (/shop/[niche]/[city]) ─────────

export type NicheLocationPageData = {
  niche: { id: string; slug: string; name: string } | null;
  cityLabel: string | null;
  stores: PublicStoreLite[];
  products: PublicProductLite[];
};

const getNicheLocationPageDataInternal = async (
  nicheSlug: string,
  citySlug: string,
): Promise<NicheLocationPageData> => {
  const supabase = createAdminSupabaseClient();

  const { data: niche } = await supabase
    .from("niches")
    .select("id, slug, name")
    .eq("slug", nicheSlug)
    .maybeSingle();

  if (!niche) {
    return { niche: null, cityLabel: null, stores: [], products: [] };
  }

  const { data: storeNicheRows } = await supabase
    .from("store_niches")
    .select("store_id")
    .eq("niche_id", niche.id);

  const candidateStoreIds = (storeNicheRows ?? []).map((row) => row.store_id as string);
  if (candidateStoreIds.length === 0) {
    return { niche, cityLabel: null, stores: [], products: [] };
  }

  const { data: storesRaw } = await supabase
    .from("stores")
    .select(
      "id, vendor_id, name, slug, city, state, country, logo_url, rating_avg, rating_count, theme_color, whatsapp_verified_at, is_verified",
    )
    .in("id", candidateStoreIds)
    .eq("is_active", true);

  const stores = ((storesRaw ?? []) as PublicStoreLite[]).filter(
    (store) => slugify(store.city ?? "") === citySlug,
  );

  if (stores.length === 0) {
    return { niche, cityLabel: null, stores: [], products: [] };
  }

  const cityLabel = stores[0].city ?? citySlug;
  const storeIds = stores.map((store) => store.id);

  const { data: productsRaw } = await supabase
    .from("products")
    .select(
      "id, store_id, slug, name, description, category, price, compare_at_price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at",
    )
    .in("store_id", storeIds)
    .eq("is_available", true)
    .order("rating_avg", { ascending: false })
    .limit(48);

  return {
    niche,
    cityLabel,
    stores,
    products: (productsRaw ?? []) as PublicProductLite[],
  };
};

export function getNicheLocationPageDataCached(nicheSlug: string, citySlug: string) {
  return unstable_cache(
    async () => getNicheLocationPageDataInternal(nicheSlug, citySlug),
    ["niche-location-page-v1", nicheSlug, citySlug],
    {
      revalidate: 300,
      tags: [CACHE_TAGS.nicheLocationPages],
    },
  )();
}

// Used by the sitemap and the landing pages themselves to know which
// niche/city combinations actually have vendors, so we never generate or
// index a thin, empty page.
export const getNicheLocationCombosCached = unstable_cache(
  async () => {
    const supabase = createAdminSupabaseClient();

    const [{ data: niches }, { data: storeNicheRows }] = await Promise.all([
      supabase.from("niches").select("id, slug, name"),
      supabase.from("store_niches").select("store_id, niche_id"),
    ]);

    const activeStoreIds = Array.from(new Set((storeNicheRows ?? []).map((row) => row.store_id as string)));
    if (activeStoreIds.length === 0) return [] as Array<{ nicheSlug: string; citySlug: string; nicheName: string; cityLabel: string }>;

    const { data: stores } = await supabase
      .from("stores")
      .select("id, city")
      .in("id", activeStoreIds)
      .eq("is_active", true)
      .not("city", "is", null);

    const cityByStoreId = new Map((stores ?? []).map((store) => [store.id as string, store.city as string]));
    const nicheById = new Map((niches ?? []).map((niche) => [niche.id as string, niche]));

    const seen = new Set<string>();
    const combos: Array<{ nicheSlug: string; citySlug: string; nicheName: string; cityLabel: string }> = [];

    for (const row of storeNicheRows ?? []) {
      const city = cityByStoreId.get(row.store_id as string);
      const niche = nicheById.get(row.niche_id as string);
      if (!city || !niche) continue;

      const citySlug = slugify(city);
      const key = `${niche.slug}:${citySlug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      combos.push({ nicheSlug: niche.slug, citySlug, nicheName: niche.name, cityLabel: city });
    }

    return combos;
  },
  ["niche-location-combos-v1"],
  { revalidate: 300, tags: [CACHE_TAGS.nicheLocationPages] },
);