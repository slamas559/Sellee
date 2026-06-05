import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import logoText from "@/app/logos/image-text-logo.png";
import { NearbyVendors } from "@/components/landing/nearby-vendors";
import { WhatsAppBotAccess } from "@/components/landing/whatsapp-bot-access";
import { UserMenu } from "@/components/layout/user-menu";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { authOptions } from "@/lib/auth";
import {
  getHomeMarketplaceBaseDataCached,
  getStoreNichesAndFollowersCached,
} from "@/lib/public-cache";
import { Search, SearchIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Sellee | Discover Local Vendors and Products and Order via WhatsApp",
  description:
    "Discover trusted local vendors and products in one place. Browse categories, compare stores, and order directly through WhatsApp-powered workflows.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Sellee | Discover Local Vendors and Products and Order via WhatsApp",
    description:
      "Discover trusted local vendors and products in one place. Browse categories, compare stores, and order directly through WhatsApp-powered workflows.",
    url: "https://sellee.store",
    siteName: "Sellee",
    images: [
      {
        url: "https://sellee.store/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Preview image for Sellee Marketplace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellee | Discover Local Vendors and Products and Order via WhatsApp",
    description:
      "Discover trusted local vendors and products in one place. Browse categories, compare stores, and order directly through WhatsApp-powered workflows.",
    images: ["https://sellee.store/opengraph-image.png"],
  },
};

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    niche?: string;
  }>;
};

type StoreLite = {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number;
  follower_count?: number;
  theme_color: string | null;
  niche_names?: string[];
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

function StoreLocation({
  store,
}: {
  store: Pick<StoreLite, "city" | "state" | "country">;
}) {
  const location = [store.city, store.state, store.country].filter(Boolean).join(", ");
  return <p className="line-clamp-1 text-xs text-slate-500">{location || "Location not set"}</p>;
}

const FALLBACK_CATEGORIES = [
  "Groceries",
  "Food",
  "Fashion",
  "Electronics",
  "Beauty",
  "Home",
];

const CATEGORY_IMAGE_SOURCES: Record<string, string> = {
  // Exact niche name matches (case-insensitive key lookup below)
  "groceries":           "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=80&h=80&q=70",
  "fashion":             "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=80&h=80&q=70",
  "electronics":         "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=80&h=80&q=70",
  "beauty":              "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=80&h=80&q=70",
  "home & living":       "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  "home-living":         "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  "health & fitness":    "https://images.unsplash.com/photo-1554284126-aa88f22d8a90?auto=format&fit=crop&w=80&h=80&q=70",
  "health-fitness":      "https://images.unsplash.com/photo-1554284126-aa88f22d8a90?auto=format&fit=crop&w=80&h=80&q=70",
  "baby & kids":         "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=80&h=80&q=70",
  "baby-kids":           "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=80&h=80&q=70",
  "furnitures":          "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  "automotive":          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=80&h=80&q=70",
  "food & drinks":       "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=80&h=80&q=70",
  "food-drinks":         "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=80&h=80&q=70",
  "books & stationery":  "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=80&h=80&q=70",
  "books-stationery":    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=80&h=80&q=70",
  "gadgets & electronics":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "gadgets-electronics":  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "sports":              "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=80&h=80&q=70",
  "art & crafts":        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=80&h=80&q=70",
  "art-crafts":          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=80&h=80&q=70",
  "digital products":    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=80&h=80&q=70",
  "digital-products":    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=80&h=80&q=70",
  "thrift & vintage":    "https://images.unsplash.com/photo-1520975918642-1d0b45d9c6f9?auto=format&fit=crop&w=80&h=80&q=70",
  "thrift-vintage":      "https://images.unsplash.com/photo-1520975918642-1d0b45d9c6f9?auto=format&fit=crop&w=80&h=80&q=70",
  "jewelry":             "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=80&h=80&q=70",
  "pets":                "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=80&h=80&q=70",
  "phones & accessories":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "phones-accessories":  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "services":            "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=80&h=80&q=70",
  "event & party":       "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=80&h=80&q=70",
  "event-party":         "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=80&h=80&q=70",
  "gaming":              "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=80&h=80&q=70",
};

const CATEGORY_IMAGE_DEFAULT =
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=80&h=80&q=70";

function categoryImageUrl(category: string): string {
  return (
    CATEGORY_IMAGE_SOURCES[category.toLowerCase().trim()] ?? CATEGORY_IMAGE_DEFAULT
  );
}

async function getMarketplaceData(q?: string, category?: string, nicheParam?: string) {
  const { stores, products, categoryRows, niches, nicheCategories } =
    await getHomeMarketplaceBaseDataCached();

  const typedStores = stores as StoreLite[];
  const allProducts = products as ProductLite[];

  const storeIds = typedStores.map((store) => store.id);
  const nichesByStoreId = new Map<string, string[]>();
  const nicheIdsByStoreId = new Map<string, string[]>();
  const followerCountByStoreId = new Map<string, number>();
  if (storeIds.length > 0) {
    const { storeNiches, follows } = await getStoreNichesAndFollowersCached(storeIds);
    for (const row of storeNiches) {
      const nicheName = row.niche?.name?.trim();
      const idList = nicheIdsByStoreId.get(row.store_id) ?? [];
      idList.push(row.niche_id);
      nicheIdsByStoreId.set(row.store_id, idList);
      if (!nicheName) continue;
      const current = nichesByStoreId.get(row.store_id) ?? [];
      current.push(nicheName);
      nichesByStoreId.set(row.store_id, current);
    }

    for (const row of follows) {
      followerCountByStoreId.set(row.store_id, (followerCountByStoreId.get(row.store_id) ?? 0) + 1);
    }
  }

  const enrichedStores = typedStores.map((store) => ({
    ...store,
    niche_names: Array.from(new Set(nichesByStoreId.get(store.id) ?? [])),
    follower_count: followerCountByStoreId.get(store.id) ?? 0,
  }));

  const storesById = new Map(enrichedStores.map((store) => [store.id, store]));

  let filteredProducts = allProducts;

  // Filter by explicit category query param (legacy behavior)
  if (category) {
    const categoryLower = category.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (product) => (product.category ?? "").toLowerCase() === categoryLower,
    );
  }

  // If a niche id or slug is provided, resolve its categories and filter products
  if (nicheParam) {
    const selectedNiche = (niches ?? []).find((n) => {
      const idMatch = String(n.id ?? "").toLowerCase() === String(nicheParam).toLowerCase();
      const slugMatch = String(n.slug ?? "").toLowerCase() === String(nicheParam).toLowerCase();
      return idMatch || slugMatch;
    });
    if (selectedNiche) {
      const categoriesInSelectedNiche = ((nicheCategories ?? []) as Array<{ niche_id: string; name: string }>)
        .filter((row) => row.niche_id === selectedNiche.id)
        .map((r) => String(r.name ?? "").toLowerCase());

      if (categoriesInSelectedNiche.length > 0) {
        filteredProducts = filteredProducts.filter((product) =>
          categoriesInSelectedNiche.includes((product.category ?? "").toLowerCase()),
        );
      }
    }
  }

  if (q) {
    const qLower = q.toLowerCase();
    const nicheRows = ((niches ?? []) as Array<{ id: string; name: string; slug: string }>);
    const nicheCategoryRows = ((nicheCategories ?? []) as Array<{ niche_id: string; name: string }>);
    const matchedNicheIds = new Set(
      nicheRows
        .filter((niche) =>
          niche.name.toLowerCase().includes(qLower) || niche.slug.toLowerCase().includes(qLower),
        )
        .map((niche) => niche.id),
    );
    const matchedCategoryNames = new Set(
      nicheCategoryRows
        .filter((row) => row.name.toLowerCase().includes(qLower))
        .map((row) => row.name.toLowerCase()),
    );

    filteredProducts = filteredProducts.filter((product) => {
      const nameText = product.name.toLowerCase();
      const descText = (product.description ?? "").toLowerCase();
      const categoryText = (product.category ?? "").toLowerCase();
      const directTextMatch =
        nameText.includes(qLower) || descText.includes(qLower) || categoryText.includes(qLower);
      if (directTextMatch) return true;

      if (categoryText && matchedCategoryNames.has(categoryText)) return true;

      const storeNicheNames = (nichesByStoreId.get(product.store_id) ?? []).map((name) =>
        name.toLowerCase(),
      );
      if (storeNicheNames.some((name) => name.includes(qLower))) return true;

      const storeNicheIds = nicheIdsByStoreId.get(product.store_id) ?? [];
      if (storeNicheIds.some((id) => matchedNicheIds.has(id))) return true;

      return false;
    });
  }

  const categories = [
    ...new Set(
      (niches ?? [])
        .map((n) => String(n.name ?? "").trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);

  return {
    stores: enrichedStores,
    products: filteredProducts.slice(0, 24),
    categories: categories.length > 0 ? categories : FALLBACK_CATEGORIES,
    storesById,
    niches,
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;

  const niche = params.niche?.trim() || undefined;
  const { stores, products, categories, storesById, niches } = await getMarketplaceData(q, category, niche);
  const isLoggedIn = Boolean(session?.user?.id);
  const isVendor = session?.user?.role === "vendor";
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim() ?? "";
  const heroPrimaryHref = !isLoggedIn ? "/login" : isVendor ? "/dashboard" : "/become-vendor";
  const heroPrimaryLabel = !isLoggedIn ? "Login to start" : isVendor ? "Open Dashboard" : "Become a Vendor";
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sellee",
    url: "https://sellee.store",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://sellee.store/marketplace?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sellee",
    url: "https://sellee.store",
    logo: "https://sellee.store/icon.png",
  };

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-9 lg:py-7">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-100 p-4 sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-300/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-amber-300/55 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="space-y-4 sm:space-y-5">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Shop Nearby, Faster
            </p>
            <h1 className="max-w-xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Discover trusted local vendors and products in one place.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Browse categories, compare stores, and order directly through WhatsApp-powered workflows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={heroPrimaryHref}
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <span className="text-white">{heroPrimaryLabel}</span>
              </Link>
              <Link
                href="/marketplace"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Browse Market
              </Link>
            </div>
          </div>

          <div className="sm:grid gap-3 sm:grid-cols-2 hidden">
            
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Featured Search</p>
              <p className="mt-1 text-base font-semibold text-emerald-700">
                {q ? `Results for "${q}"` : "Trending in your marketplace now"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {botNumber ? <WhatsAppBotAccess botNumber={botNumber} /> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Browse Categories</h2>
          {niche ? (
            <Link href={q ? `/search?q=${encodeURIComponent(q)}` : `/search`} className="text-sm font-medium text-emerald-700 hover:underline">
              Clear niche
            </Link>
          ) : (
            <Link href="/marketplace" className="text-sm font-medium">
              <span className="text-emerald-700 hover:underline">Browse marketplace</span>
            </Link>
          )}
        </div>
        <div className="mt-4 -mx-1 flex snap-x snap-mandatory no-scrollbar gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
          {categories.map((item) => {
            const nicheObj = (niches ?? []).find((n) => String(n.name ?? "").toLowerCase() === String(item).toLowerCase());
            const nicheId = nicheObj?.id ?? nicheObj?.slug ?? item;
            const href = q
              ? `/search?q=${encodeURIComponent(q)}&niche=${encodeURIComponent(nicheId)}&title=${encodeURIComponent(item)}`
              : `/search?niche=${encodeURIComponent(nicheId)}&title=${encodeURIComponent(item)}`;
            const isActive = niche?.toLowerCase() === String(nicheId).toLowerCase();

            return (
              <Link
                key={item}
                href={href}
                className={`group inline-flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-2.5 py-2 pr-3 text-xs sm:text-sm font-semibold transition ${
                  isActive
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <span className={`relative h-8 w-8 overflow-hidden rounded-xl ring-1 ${isActive ? "ring-white/40" : "ring-slate-200"}`}>
                  <Image
                    src={categoryImageUrl(item)}
                    alt={`${item} category`}
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="32px"
                    unoptimized
                  />
                </span>
                {item}
              </Link>
            );
          })}
        </div>
      </section>
      <NearbyVendors
        initialVendors={stores.slice(0, 8).map((store) => ({
          ...store,
          distance_km: null,
        }))}
      />

      <section id="market" className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Marketplace</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Popular Products</h2>
          </div>
          <p className="text-sm text-slate-600">{products.length} items found</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No products match this filter yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 justify-items-center gap-1 [@media(max-width:320px)]:grid-cols-1 sm:mt-5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const store = storesById.get(product.store_id);
              if (!store) return null;
              return (
                <div key={product.id} className="w-full max-w-[320px] space-y-2">
                  <ProductShowcaseCard
                    product={product}
                    store={store}
                    variant="home"
                  />
                  <div className="px-1">
                    <StoreLocation store={store} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
