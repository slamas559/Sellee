import type { Metadata } from "next";
import Link from "next/link";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { LocationFilterButton } from "@/components/marketplace/location-filter-button";
import { formatNaira } from "@/lib/format";
import { haversineDistanceKm } from "@/lib/geo";
import MarketplaceFilterForm from "@/components/marketplace/marketplace-filter-form";
import { parseSearchState, getMarketplaceResults } from "@/app/marketplace/page";
import { FilterButton } from "@/components/marketplace/filter-button";

export async function generateMetadata({ searchParams }: { searchParams: any }) {
  const state = parseSearchState(await searchParams as any);
  const title = state.title || (state.q ? `Results for ${state.q}` : "Search Results");
  return { title } as Metadata;
}

type SearchPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const state = parseSearchState(await searchParams as any);
  const { products, categories, grouped_categories } = await getMarketplaceResults(state as any);
  const hasLocationFilter = state.lat !== null && state.lng !== null;

  const activeFilters: Array<{ label: string; clearHref: string }> = [];
  if (state.q) {
    activeFilters.push({ label: `Search: ${state.q}`, clearHref: `/search?` });
  }

  const pageTitle = state.title || (state.q ? `Results for "${state.q}"` : "Search Results");

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-2 py-6 sm:px-3 lg:py-8">
      <header className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Catalog</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{pageTitle}</h1>
          </div>
          <Link href="/" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back Home</Link>
        </div>
      </header>
      {/* mobile device filter */}
      
      <FilterButton state={state} categories={categories} grouped_categories={grouped_categories} hasLocationFilter={hasLocationFilter} activeFilters={activeFilters.map((f) => f.label)} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="top-25 hidden h-fit rounded-3xl border border-emerald-200/80 bg-white/90 p-5 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.35)] backdrop-blur lg:block">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Smart Filters</p>
            <p className="mt-1 text-sm text-slate-600">Refine results by category, price, and location.</p>
          </div>
          <MarketplaceFilterForm state={state as any} categories={categories} groupedCategories={grouped_categories} hasLocationFilter={hasLocationFilter} />
        </aside>

        <section className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-900">Products</h2>
            <p className="text-sm text-slate-600">{products.length} results</p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No products match your current filters.</div>
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-2 [@media(max-width:320px)]:grid-cols-1 sm:gap-3 xl:grid-cols-3">
              {products.map((product: any) => (
                <div key={product.id} className="w-full max-w-[320px] space-y-2">
                  <ProductShowcaseCard product={product} store={product.store} variant="marketplace" />
                  <div className="px-1">
                    <p className="line-clamp-1 text-xs text-slate-500">{product.store.city ?? ""}</p>
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
