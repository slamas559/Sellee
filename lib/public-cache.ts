import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const CACHE_TAGS = {
  homeMarketplaceBase: "home-marketplace-base",
  storeNichesFollowers: "store-niches-followers",
  marketplaceBase: "marketplace-base",
  marketplaceStoreNiches: "marketplace-store-niches",
  marketplaceProducts: "marketplace-products",
  storefrontPublic: "storefront-public",
  storefrontBySlug: (slug: string) => `storefront:${slug}`,
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
};

export type PublicProductLite = {
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
        .select("id, vendor_id, name, slug, city, state, country, logo_url, rating_avg, rating_count, theme_color")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("products")
        .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
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
          "id, name, slug, city, state, country, logo_url, rating_avg, rating_count, latitude, longitude",
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
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
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
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!store) {
    return { store: null, products: [] as PublicProductLite[], nicheNames: [] as string[] };
  }

  const [{ data: products }, { data: storeNiches }] = await Promise.all([
    supabase
      .from("products")
      .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .eq("store_id", store.id)
      .eq("is_available", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("store_niches")
      .select("niche:niche_id(name)")
      .eq("store_id", store.id),
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
