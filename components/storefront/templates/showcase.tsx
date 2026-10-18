import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import { CategoryNav, ChatButton, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm, StoreLogo, TrustLine } from "../controls";
import type { TemplateProps } from "../types";

/**
 * SHOWCASE - brand-story layout. Split hero with an arched photo, large snap
 * carousel for new arrivals, then a staggered two/three-column product wall.
 */
export function ShowcaseTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const showHero = !p.isFiltered;
  const featured = showHero && products.length >= 5 ? products.slice(0, 6) : [];
  const cardStore = { slug: store.slug, currency: store.currency };
  const headline = copy.title || store.name;

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href={`${p.storeUrl}/profile`} className="flex min-w-0 items-center gap-3">
          <StoreLogo store={store} size={40} className="rounded-full" />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate text-base font-bold ${T.display}`}>{store.name}</span>
            <VerificationPill tier={effectiveTier(store)} size="sm" />
          </span>
        </Link>
        <FollowAndShare p={p} />
      </header>

      {showHero ? (
        <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-20 lg:pt-10">
          <div className="order-2 lg:order-1">
            {p.nicheNames.length > 0 ? (
              <div className="mb-5 flex flex-wrap gap-2">
                {p.nicheNames.slice(0, 3).map((n) => (
                  <span key={n} className={`rounded-full px-3 py-1 text-xs font-semibold ${T.primarySoft} ${T.primaryText}`}>{n}</span>
                ))}
              </div>
            ) : null}
            <h1 className={`text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl ${T.display}`}>{headline}</h1>
            {copy.subtitle ? <p className={`mt-5 max-w-md text-base leading-7 sm:text-lg ${T.muted}`}>{copy.subtitle}</p> : null}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ChatButton href={p.whatsappUrl} label={copy.cta} className="h-12 rounded-full px-7" />
              <a href="#products" className={`inline-flex h-12 items-center rounded-full border px-6 text-sm font-semibold ${T.line} bg-white hover:border-[color:var(--s-primary)]`}>
                Browse {p.totalProducts} product{p.totalProducts === 1 ? "" : "s"}
              </a>
            </div>
            <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`mt-6 ${T.muted}`} />
          </div>

          <div className="order-1 lg:order-2">
            <div className={`relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-t-[999px] rounded-b-[var(--s-r-lg)] ${T.primarySoft} lg:max-w-none`}>
              {config.hero_image_url ? (
                <Image src={config.hero_image_url} alt={store.name} fill priority sizes="(max-width:1024px) 90vw, 45vw" className="object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-[10rem] font-bold leading-none opacity-30 ${T.primaryText} ${T.display}`} aria-hidden="true">
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {showHero && copy.promo ? (
        <div className={`${T.primary} px-4 py-3 text-center text-sm font-semibold`}>{copy.promo}</div>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="new-in" className="mx-auto max-w-7xl py-12 sm:py-16">
          <div className="mb-6 flex items-end justify-between px-4 sm:px-8">
            <h2 id="new-in" className={`text-3xl font-bold tracking-tight sm:text-4xl ${T.display}`}>New in</h2>
            <a href="#products" className={`text-sm font-semibold underline underline-offset-4 ${T.primaryText}`}>See all</a>
          </div>
          <div className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:scroll-px-8 sm:gap-6 sm:px-8">
            {featured.map((item, i) => (
              <div key={item.id} className="w-[68vw] max-w-[320px] shrink-0 snap-start sm:w-72">
                <StoreProductCard product={item} store={cardStore} variant="soft" aspect="4/5" priority={i < 2} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showHero && bannerUrls.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-8">
          <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-44 !rounded-[var(--s-r-lg)] sm:h-72" />
        </div>
      ) : null}

      <section id="products" aria-labelledby="wall" className="mx-auto max-w-7xl scroll-mt-4 px-4 pb-24 pt-6 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 id="wall" className={`text-3xl font-bold tracking-tight sm:text-4xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : "Everything")}
          </h2>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <SearchForm action={`${p.storeHomeHref}#products`} query={p.query} category={p.selectedCategory} sort={p.sort} className="sm:w-64" />
            <CurrencyRow currencies={store.activated_currencies ?? []} />
          </div>
        </div>
        <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="pill" className="mb-8" />

        {products.length === 0 ? (
          <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-8 sm:gap-5 md:grid-cols-4 [&>*:nth-child(even)]:translate-y-6 md:[&>*:nth-child(even)]:translate-y-10">
            {products.map((item) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="soft" aspect="4/5" />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
