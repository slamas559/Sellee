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
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Home",
};

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
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

const CATEGORY_IMAGE_SOURCES: Array<{ match: RegExp; image: string }> = [
  {
    match: /(grocery|food|breakfast|drink|snack|meal|restaurant|kitchen)/i,
    image:
      "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=80&h=80&q=70",
  },
  {
    match: /(fashion|cloth|clothe|wear|shoe|bag|boutique)/i,
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=80&h=80&q=70",
  },
  {
    match: /(electronic|phone|laptop|device|gadget|tech)/i,
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  },
  {
    match: /(beauty|cosmetic|skincare|makeup|salon)/i,
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=80&h=80&q=70",
  },
  {
    match: /(home|furniture|decor|interior)/i,
    image:
      "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  },
  {
    match: /(sport|fitness|gym)/i,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=80&h=80&q=70",
  },
];

function categoryImageUrl(category: string): string {
  return (
    CATEGORY_IMAGE_SOURCES.find((item) => item.match.test(category))?.image ??
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=80&h=80&q=70"
  );
}

async function getMarketplaceData(q?: string, category?: string) {
  const supabase = createAdminSupabaseClient();

  const storesPromise = supabase
    .from("stores")
    .select("id, vendor_id, name, slug, city, state, country, logo_url, rating_avg, rating_count, theme_color")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(24);

  const productsQuery = supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(500);

  const categoryRowsPromise = supabase
    .from("products")
    .select("category")
    .eq("is_available", true)
    .not("category", "is", null)
    .limit(100);

  const nichesPromise = supabase
    .from("niches")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const nicheCategoriesPromise = supabase
    .from("niche_categories")
    .select("niche_id, name");

  const [{ data: stores }, { data: products }, { data: categoryRows }, { data: niches }, { data: nicheCategories }] = await Promise.all([
    storesPromise,
    productsQuery,
    categoryRowsPromise,
    nichesPromise,
    nicheCategoriesPromise,
  ]);

  const typedStores = (stores ?? []) as StoreLite[];
  const allProducts = (products ?? []) as ProductLite[];

  const storeIds = typedStores.map((store) => store.id);
  const nichesByStoreId = new Map<string, string[]>();
  const nicheIdsByStoreId = new Map<string, string[]>();
  if (storeIds.length > 0) {
    const { data: storeNiches } = await supabase
      .from("store_niches")
      .select("store_id, niche_id, niche:niche_id(name)")
      .in("store_id", storeIds);

    for (const row of (storeNiches ?? []) as Array<{ store_id: string; niche_id: string; niche?: { name?: string } | null }>) {
      const nicheName = row.niche?.name?.trim();
      const idList = nicheIdsByStoreId.get(row.store_id) ?? [];
      idList.push(row.niche_id);
      nicheIdsByStoreId.set(row.store_id, idList);
      if (!nicheName) continue;
      const current = nichesByStoreId.get(row.store_id) ?? [];
      current.push(nicheName);
      nichesByStoreId.set(row.store_id, current);
    }
  }

  const followerCountByStoreId = new Map<string, number>();
  if (storeIds.length > 0) {
    const { data: followsData } = await supabase
      .from("customer_store_follows")
      .select("store_id")
      .in("store_id", storeIds);

    for (const row of (followsData ?? []) as Array<{ store_id: string }>) {
      followerCountByStoreId.set(
        row.store_id,
        (followerCountByStoreId.get(row.store_id) ?? 0) + 1,
      );
    }
  }

  const enrichedStores = typedStores.map((store) => ({
    ...store,
    niche_names: Array.from(new Set(nichesByStoreId.get(store.id) ?? [])),
    follower_count: followerCountByStoreId.get(store.id) ?? 0,
  }));

  const storesById = new Map(enrichedStores.map((store) => [store.id, store]));

  let filteredProducts = allProducts;
  if (category) {
    const categoryLower = category.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (product) => (product.category ?? "").toLowerCase() === categoryLower,
    );
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
      (categoryRows ?? [])
        .map((row) => String(row.category ?? "").trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);

  return {
    stores: enrichedStores,
    products: filteredProducts.slice(0, 24),
    categories: categories.length > 0 ? categories : FALLBACK_CATEGORIES,
    storesById,
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;

  const { stores, products, categories, storesById } = await getMarketplaceData(q, category);
  const isLoggedIn = Boolean(session?.user?.id);
  const isVendor = session?.user?.role === "vendor";
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim() ?? "";
  const heroPrimaryHref = !isLoggedIn ? "/login" : isVendor ? "/dashboard" : "/become-vendor";
  const heroPrimaryLabel = !isLoggedIn ? "Login to start" : isVendor ? "Open Dashboard" : "Become a Vendor";

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-9 lg:py-7">
      <header className="rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 text-xs text-slate-600 sm:px-6">
          <p>Sellee Marketplace</p>
          <UserMenu isLoggedIn={isLoggedIn} isVendor={isVendor} />
        </div>

        <div className="flex flex-wrap items-center gap-3 px-3 py-4 sm:gap-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
            <Image
              src={logoText}
              alt="Sellee logo"
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>

          <form action="/" className="flex min-w-0 flex-1 basis-[620px] items-center gap-2 rounded-full border border-slate-200 bg-white p-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by product, category, or niche..."
              className="w-full bg-transparent px-3 py-2 text-sm text-slate-700 outline-none"
            />
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <button
              type="submit"
              className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              Search
            </button>
          </form>
        </div>
      </header>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
              <p className="text-sm text-slate-600">Active Vendors</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{stores.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/85 p-4 shadow-sm">
              <p className="text-sm text-slate-600">Listed Products</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{products.length}</p>
            </div>
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
          {category ? (
            <Link href={q ? `/?q=${encodeURIComponent(q)}` : "/"} className="text-sm font-medium text-emerald-700 hover:underline">
              Clear category
            </Link>
          ) : (
            <Link href="/marketplace" className="text-sm font-medium text-emerald-700 hover:underline">
              Open full marketplace
            </Link>
          )}
        </div>
        <div className="mt-4 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
          {categories.map((item) => {
            const href = q
              ? `/?q=${encodeURIComponent(q)}&category=${encodeURIComponent(item)}`
              : `/?category=${encodeURIComponent(item)}`;
            const isActive = category?.toLowerCase() === item.toLowerCase();

            return (
              <Link
                key={item}
                href={href}
                className={`group inline-flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-2.5 py-2 pr-3 text-sm font-semibold transition ${
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
