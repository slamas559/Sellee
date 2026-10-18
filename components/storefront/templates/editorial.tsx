import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import { CategoryNav, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm, StoreLogo, TrustLine } from "../controls";
import type { TemplateProps } from "../types";

/**
 * EDITORIAL - fashion / boutique. Centered serif masthead, text navigation,
 * full-bleed hero, an asymmetric "selected pieces" spread, then a borderless
 * collection grid with tall images. Square corners, hairlines, lots of air.
 */
export function EditorialTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const showSpread = !p.isFiltered && products.length >= 4;
  const lead = showSpread ? products[0] : null;
  const side = showSpread ? products.slice(1, 3) : [];
  const rest = showSpread ? products.slice(3) : products;
  const cardStore = { slug: store.slug, currency: store.currency };
  const kicker = p.nicheNames.slice(0, 3).join("  /  ");

  return (
    <>
      {/* Masthead */}
      <header className={`border-b ${T.line}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex items-center justify-between gap-3 py-3 text-[11px] uppercase tracking-[0.2em]">
            <span className={`hidden truncate sm:block ${T.muted}`}>{kicker}</span>
            <span className="ml-auto">
              <FollowAndShare p={p} />
            </span>
          </div>
          <div className="flex flex-col items-center pb-6 pt-2 text-center sm:pb-9">
            <Link href={`${p.storeUrl}/profile`} className="group flex flex-col items-center gap-3">
              {store.logo_url ? <StoreLogo store={store} size={44} className="rounded-full" /> : null}
              <span className={`flex items-center gap-2 text-4xl leading-none tracking-tight sm:text-6xl ${T.display}`}>
                {store.name}
                <VerificationPill tier={effectiveTier(store)} size="sm" />
              </span>
            </Link>
            <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`mt-3 ${T.muted}`} />
          </div>
          <div className={`flex items-center justify-between gap-6 border-t ${T.line}`}>
            <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="text" className="min-w-0 flex-1" />
            <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="underline" className="hidden w-48 shrink-0 sm:flex" />
          </div>
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="underline" className="pb-3 sm:hidden" />
        </div>
      </header>

      {/* Hero */}
      {!p.isFiltered && (config.hero_image_url || copy.title) ? (
        config.hero_image_url ? (
          <section className="relative isolate flex min-h-[460px] items-end overflow-hidden bg-stone-900 sm:min-h-[72svh]">
            <Image src={config.hero_image_url} alt={store.name} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 text-white sm:px-8 sm:pb-16">
              {copy.promo ? <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-white/80">{copy.promo}</p> : null}
              <h1 className={`max-w-3xl text-5xl leading-[0.95] tracking-tight sm:text-8xl ${T.display}`}>{copy.title || store.name}</h1>
              {copy.subtitle ? <p className="mt-5 max-w-md text-sm leading-6 text-white/85 sm:text-base">{copy.subtitle}</p> : null}
              <a href={p.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-block border-b border-white pb-1 text-[11px] font-medium uppercase tracking-[0.25em]">
                {copy.cta} &rarr;
              </a>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-28">
            {copy.promo ? <p className={`mb-5 text-[11px] uppercase tracking-[0.3em] ${T.muted}`}>{copy.promo}</p> : null}
            <h1 className={`text-4xl leading-[1.02] tracking-tight sm:text-7xl ${T.display}`}>{copy.title}</h1>
            {copy.subtitle ? <p className={`mx-auto mt-6 max-w-lg text-base leading-7 ${T.muted}`}>{copy.subtitle}</p> : null}
            <a href={p.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-block border-b border-[color:var(--s-ink)] pb-1 text-[11px] font-medium uppercase tracking-[0.25em]">
              {copy.cta} &rarr;
            </a>
          </section>
        )
      ) : null}

      {/* Selected pieces spread */}
      {lead ? (
        <section aria-labelledby="selected" className="mx-auto max-w-7xl px-4 pb-4 pt-12 sm:px-8 sm:pt-20">
          <div className="mb-8 flex items-end justify-between sm:mb-12">
            <h2 id="selected" className={`text-3xl tracking-tight sm:text-5xl ${T.display}`}>Selected pieces</h2>
            <span className={`text-[11px] uppercase tracking-[0.2em] ${T.muted}`}>New in</span>
          </div>
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-12 md:gap-x-10">
            <div className="md:col-span-7">
              <StoreProductCard product={lead} store={cardStore} variant="plain" priority />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:col-span-5 md:gap-x-6">
              {side.map((item, i) => (
                <div key={item.id} className={i === 1 ? "md:mt-24" : ""}>
                  <StoreProductCard product={item} store={cardStore} variant="plain" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!p.isFiltered && bannerUrls.length > 0 ? (
        <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-8">
          <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-52 sm:h-80 sm:!rounded-none" />
        </div>
      ) : null}

      {/* Collection */}
      <section aria-labelledby="collection" className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-8 sm:pt-20">
        <div className={`mb-8 flex flex-wrap items-end justify-between gap-3 border-b pb-4 ${T.line}`}>
          <h2 id="collection" className={`text-2xl tracking-tight sm:text-4xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : showSpread ? "The collection" : "Shop")}
          </h2>
          <div className="flex items-center gap-4">
            <CurrencyRow currencies={store.activated_currencies ?? []} />
            <span className={`text-[11px] uppercase tracking-[0.2em] ${T.muted}`}>{products.length} items</span>
          </div>
        </div>
        {products.length === 0 ? (
          <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-6 sm:gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {rest.map((item, i) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="plain" priority={!showSpread && i < 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
