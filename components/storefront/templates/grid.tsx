import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import { buildHref, CategoryNav, ChatButton, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm, SortLinks, StoreLogo, TrustLine } from "../controls";
import type { TemplateProps } from "../types";

/**
 * GRID - catalogue layout for electronics / parts / high-SKU stores.
 * Dark app bar with search, left filter rail on desktop (categories with
 * counts + store info), sort controls, and dense spec-style cards.
 */
export function GridTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const cardStore = { slug: store.slug, currency: store.currency };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--s-ink)] text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6">
          <Link href={`${p.storeUrl}/profile`} className="flex min-w-0 items-center gap-2.5">
            <StoreLogo store={store} size={32} className="rounded" />
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="max-w-[9rem] truncate text-sm font-bold tracking-tight sm:max-w-xs">{store.name}</span>
              <VerificationPill tier={effectiveTier(store)} size="sm" onDark />
            </span>
          </Link>
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search products, brands, categories" variant="box" className="hidden flex-1 md:flex md:max-w-2xl [&_label]:text-slate-900" />
          <div className="ml-auto flex items-center gap-2">
            <ChatButton href={p.whatsappUrl} label="Chat & order" className="h-9 rounded px-3.5" />
          </div>
        </div>
        <div className="px-3 pb-2.5 md:hidden">
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search products" variant="box" className="[&_label]:text-slate-900" />
        </div>
      </header>

      <div className={`border-b ${T.line} bg-white`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-3 py-2 sm:px-6">
          <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} products={p.totalProducts} className={T.muted} />
          <div className="flex items-center gap-3">
            {copy.promo ? <span className={`rounded px-2 py-0.5 text-xs font-bold ${T.primary}`}>{copy.promo}</span> : null}
            <div className="lg:hidden">
              <FollowAndShare p={p} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6 lg:py-6">
        {/* Filter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className={`${T.card} border ${T.line} ${T.rLg} p-3`}>
              <h2 className={`mb-2 px-2 text-[11px] font-bold uppercase tracking-wider ${T.muted}`}>Categories</h2>
              <ul className="space-y-0.5">
                {[{ label: "All products", value: "", count: p.totalProducts }, ...p.categories.map((c) => ({ label: c, value: c, count: p.categoryCounts[c] ?? 0 }))].map((c) => {
                  const active = p.selectedCategory === c.value;
                  return (
                    <li key={c.label}>
                      <Link
                        href={buildHref(p.storeHomeHref, { q: p.query, category: c.value, sort: p.sort })}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center justify-between gap-2 ${T.r} px-2 py-1.5 text-sm font-medium transition ${active ? T.primary : "hover:bg-black/5"}`}
                      >
                        <span className="truncate">{c.label}</span>
                        <span className={`text-xs tabular-nums ${active ? "opacity-80" : T.muted}`}>{c.count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={`${T.card} border ${T.line} ${T.rLg} p-3`}>
              {config.hero_image_url ? (
                <div className={`relative mb-3 aspect-[16/10] overflow-hidden ${T.r}`}>
                  <Image src={config.hero_image_url} alt={store.name} fill sizes="250px" className="object-cover" />
                </div>
              ) : null}
              <p className="px-1 text-sm font-bold">{copy.title || store.name}</p>
              {copy.subtitle ? <p className={`mt-1 px-1 text-xs leading-5 ${T.muted}`}>{copy.subtitle}</p> : null}
              <div className="mt-3 px-1">
                <FollowAndShare p={p} />
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 space-y-3">
          <div className="space-y-2 lg:hidden">
            <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="box" />
          </div>

          {!p.isFiltered && bannerUrls.length > 0 ? (
            <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-32 !rounded-[var(--s-r-lg)] sm:h-44" />
          ) : null}

          <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${T.card} border ${T.line} ${T.r} px-3 py-2`}>
            <p className="text-sm">
              <span className="font-bold">{products.length}</span>{" "}
              <span className={T.muted}>
                result{products.length === 1 ? "" : "s"}
                {p.selectedCategory ? ` in ${p.selectedCategory}` : ""}
                {p.query ? ` for “${p.query}”` : ""}
              </span>
            </p>
            <div className="flex min-w-0 items-center gap-3">
              <SortLinks base={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} />
              <CurrencyRow currencies={store.activated_currencies ?? []} />
            </div>
          </div>

          {products.length === 0 ? (
            <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
              {products.map((item, i) => (
                <StoreProductCard key={item.id} product={item} store={cardStore} variant="dense" priority={i < 4} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
