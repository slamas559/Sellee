import type { MetadataRoute } from "next";
import { formatProductPathSegment } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { getNicheLocationCombosCached } from "@/lib/public-cache";
import { storeUrl, storeProductUrl } from "@/lib/store-url";

const BASE_URL = "https://sellee.store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/vendors`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/data-deletion`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/become-vendor`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const { data: stores } = await supabase
    .from("stores")
    .select("id, slug, created_at")
    .eq("is_active", true);

  const storeRoutes: MetadataRoute.Sitemap = (stores ?? [])
    .filter((store) => Boolean(store.slug))
    .map((store) => ({
      url: storeUrl(store.slug!),
      lastModified: store.created_at ? new Date(store.created_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const storeIds = (stores ?? []).map((store) => store.id);

  let productRoutes: MetadataRoute.Sitemap = [];
  if (storeIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, slug, store_id, created_at")
      .eq("is_available", true)
      .in("store_id", storeIds);

    const slugByStoreId = new Map((stores ?? []).map((store) => [store.id, store.slug]));
    productRoutes = (products ?? []).flatMap((product) => {
      const slug = slugByStoreId.get(product.store_id);
      if (!slug) return [];
      return [
        {
          url: storeProductUrl(
            slug,
            formatProductPathSegment({
              id: product.id,
              slug: product.slug,
            }),
          ),
          lastModified: product.created_at ? new Date(product.created_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.6,
        } satisfies MetadataRoute.Sitemap[number],
      ];
    });
  }

  const combos = await getNicheLocationCombosCached();
  const nicheLocationRoutes: MetadataRoute.Sitemap = combos.map((combo) => ({
    url: `${BASE_URL}/shop/${combo.nicheSlug}/${combo.citySlug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...storeRoutes, ...productRoutes, ...nicheLocationRoutes];
}