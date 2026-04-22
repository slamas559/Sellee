import Link from "next/link";
import { NearbyVendors } from "@/components/landing/nearby-vendors";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
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
  theme_color: string | null;
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

const FALLBACK_CATEGORIES = [
  "Groceries",
  "Food",
  "Fashion",
  "Electronics",
  "Beauty",
  "Home",
];

async function getMarketplaceData(q?: string, category?: string) {
  const supabase = createAdminSupabaseClient();

  const storesPromise = supabase
    .from("stores")
    .select("id, name, slug, city, state, country, logo_url, rating_avg, rating_count, theme_color")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(24);

  let productsQuery = supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, created_at")
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(24);

  if (category) {
    productsQuery = productsQuery.eq("category", category);
  }

  if (q) {
    productsQuery = productsQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const categoryRowsPromise = supabase
    .from("products")
    .select("category")
    .eq("is_available", true)
    .not("category", "is", null)
    .limit(100);

  const [{ data: stores }, { data: products }, { data: categoryRows }] = await Promise.all([
    storesPromise,
    productsQuery,
    categoryRowsPromise,
  ]);

  const typedStores = (stores ?? []) as StoreLite[];
  const typedProducts = (products ?? []) as ProductLite[];

  const storesById = new Map(typedStores.map((store) => [store.id, store]));

  const categories = [
    ...new Set(
      (categoryRows ?? [])
        .map((row) => String(row.category ?? "").trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);

  return {
    stores: typedStores,
    products: typedProducts,
    categories: categories.length > 0 ? categories : FALLBACK_CATEGORIES,
    storesById,
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;

  const { stores, products, categories, storesById } = await getMarketplaceData(q, category);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-7 px-4 py-5 sm:px-6 sm:py-7 lg:gap-10 lg:py-8">
      <header className="rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-xs text-slate-600 sm:px-6">
          <p>Sellee Marketplace</p>
          <div className="flex items-center gap-3">
            <Link href="/register" className="hover:text-emerald-700">Become a Vendor</Link>
            <span className="text-slate-300">|</span>
            <Link href="/login" className="hover:text-emerald-700">Account</Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
            <span className="text-xl font-black tracking-tight text-emerald-700">Sellee</span>
          </Link>

          <form action="/" className="flex min-w-[260px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white p-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search products, brands, and vendors..."
              className="w-full bg-transparent px-3 py-2 text-sm text-slate-700 outline-none"
            />
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Search
            </button>
          </form>

          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
            White + Green + Yellow theme
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-100 p-6 sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-300/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-amber-300/55 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Shop Nearby, Faster
            </p>
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Discover trusted local vendors and products in one place.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Browse categories, compare stores, and order directly through WhatsApp-powered workflows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Start Selling
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Browse Categories</h2>
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
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => {
            const href = q
              ? `/?q=${encodeURIComponent(q)}&category=${encodeURIComponent(item)}`
              : `/?category=${encodeURIComponent(item)}`;
            const isActive = category?.toLowerCase() === item.toLowerCase();

            return (
              <Link
                key={item}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
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

      <section id="market" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const store = storesById.get(product.store_id);
              if (!store) return null;
              return (
                <ProductShowcaseCard
                  key={product.id}
                  product={product}
                  store={store}
                  variant="home"
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

