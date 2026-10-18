import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import {
  CategoryNav,
  ChatButton,
  CurrencyRow,
  EmptyProducts,
  FollowAndShare,
  SearchForm,
  StoreLogo,
  TrustLine,
} from "../controls";
import type { TemplateProps } from "../types";

/**
 * MARKET - marketplace-style layout for high-volume shops.
 * Sticky app bar with search always in reach, promo strip, banner, a "Deals"
 * shelf pulled out of the catalogue, then a dense 2-5 column grid.
 */
export function MarketTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const showShelves = !p.isFiltered;
  const deals = products
    .filter((x) => x.compare_at_price && Number(x.compare_at_price) > Number(x.price))
    .slice(0, 10);
  const banners = [config.hero_image_url, ...bannerUrls].filter(Boolean) as string[];
  const cardStore = { slug: store.slug, currency: store.currency };

  return (
    <>
      <header className={`sticky top-0 z-30 border-b ${T.line} bg-white/95 backdrop-blur`}>
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex items-center gap-3 py-2.5">
            <Link href={`${p.storeUrl}/profile`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <StoreLogo store={store} size={36} className={T.r} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-extrabold leading-tight">{store.name}</span>
                  <VerificationPill tier={effectiveTier(store)} size="sm" />
                </span>
                <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`hidden truncate sm:block ${"text-[color:var(--s-muted)]"}`} />
              </span>
            </Link>
            <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search products" className="hidden max-w-md flex-1 md:flex" />
            <ChatButton href={p.whatsappUrl} label="Chat" className={`h-9 px-4 ${T.r}`} />
            <div className="hidden sm:block">
              <FollowAndShare p={p} />
            </div>
          </div>
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search products" className="pb-2 md:hidden" />
          <div className="flex items-center justify-between gap-2 pb-2.5 sm:hidden">
            <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`min-w-0 truncate ${T.muted}`} />
            <FollowAndShare p={p} />
          </div>
        </div>
      </header>

      {copy.promo ? (
        <div className={`${T.primary} px-3 py-2 text-center text-xs font-bold tracking-wide sm:text-sm`}>{copy.promo}</div>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6 sm:py-6">
        {showShelves && banners.length > 0 ? (
          <div className="relative">
            <BannerCarousel banners={banners} storeName={store.name} className="h-40 sm:h-64 lg:h-72" />
            {copy.title ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6">
                <p className="max-w-xl text-lg font-extrabold leading-tight text-white sm:text-3xl">{copy.title}</p>
                {copy.subtitle ? <p className="mt-1 hidden max-w-lg text-sm text-white/85 sm:block">{copy.subtitle}</p> : null}
              </div>
            ) : null}
          </div>
        ) : showShelves && copy.title ? (
          <div className={`${T.card} border ${T.line} ${T.rLg} p-5`}>
            <h1 className="text-xl font-extrabold sm:text-2xl">{copy.title}</h1>
            {copy.subtitle ? <p className={`mt-1 text-sm ${T.muted}`}>{copy.subtitle}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="pill" className="min-w-0 flex-1" />
          <CurrencyRow currencies={store.activated_currencies ?? []} />
        </div>

        {showShelves && deals.length >= 2 ? (
          <section aria-labelledby="deals-heading" className={`${T.primarySoft} ${T.rLg} p-3 sm:p-4`}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="deals-heading" className="text-base font-extrabold sm:text-lg">Deals</h2>
              <span className={`text-xs ${T.muted}`}>{deals.length} on sale</span>
            </div>
            <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {deals.map((d) => (
                <div key={d.id} className="w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-44">
                  <StoreProductCard product={d} store={cardStore} variant="market" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="all-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="all-heading" className="text-base font-extrabold sm:text-lg">
              {p.selectedCategory || (p.query ? `Results for "${p.query}"` : "All products")}
            </h2>
            <span className={`text-xs ${T.muted}`}>{products.length} item{products.length === 1 ? "" : "s"}</span>
          </div>
          {products.length === 0 ? (
            <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((item, i) => (
                <StoreProductCard key={item.id} product={item} store={cardStore} variant="market" priority={i < 4} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
