import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { Price } from "../card-parts";
import { productHref } from "../utils";
import { StoreProductCard } from "../product-cards";
import { CategoryNav, ChatButton, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm, StoreLogo, TrustLine } from "../controls";
import type { TemplateProps } from "../types";

/**
 * NOIR GALLERY - dark, quiet luxury for jewelry / watches / fragrance.
 * Letter-spaced masthead, an optional full-bleed hero, one "spotlight" piece
 * presented like a museum label, then a framed three-column collection.
 */
export function NoirTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const cardStore = { slug: store.slug, currency: store.currency };
  const home = !p.isFiltered;
  const spot = home ? products[0] : undefined;
  const rest = spot ? products.slice(1) : products;
  const spotImg = spot ? (spot.image_urls ?? []).find(Boolean) ?? spot.image_url : null;
  const shareClass = `inline-flex h-8 w-8 items-center justify-center rounded-full border ${T.line} bg-transparent text-[color:var(--s-ink)] hover:bg-white/10`;

  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
        <div className="flex items-center justify-between">
          <span className={`hidden text-[10px] uppercase tracking-[0.3em] sm:block ${T.muted}`}>{p.nicheNames.slice(0, 2).join("  /  ")}</span>
          <span className="ml-auto"><FollowAndShare p={p} shareClassName={shareClass} /></span>
        </div>
        <div className="flex flex-col items-center pb-7 pt-3 text-center sm:pb-10">
          <StoreLogo store={store} size={44} className="mb-4 rounded-full" />
          <Link href={`${p.storeUrl}/profile`} className="flex items-center gap-3">
            <span className={`text-3xl uppercase tracking-[0.28em] sm:text-5xl ${T.display}`}>{store.name}</span>
            <VerificationPill tier={effectiveTier(store)} size="sm" onDark />
          </Link>
          <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`mt-4 tracking-widest ${T.muted}`} />
        </div>
        <div className={`flex items-center justify-between gap-6 border-y ${T.line}`}>
          <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="text" className="min-w-0 flex-1" />
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="underline" className="hidden w-44 shrink-0 sm:flex" />
        </div>
      </header>

      {home && config.hero_image_url ? (
        <section className="relative mt-8 flex min-h-[380px] items-end overflow-hidden sm:min-h-[560px]">
          <Image src={config.hero_image_url} alt={store.name} fill priority sizes="100vw" className="object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e0d] via-[#0f0e0d]/30 to-transparent" />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 text-center sm:px-8 sm:pb-14">
            {copy.promo ? <p className={`mb-3 text-[11px] uppercase tracking-[0.35em] ${T.primaryText}`}>{copy.promo}</p> : null}
            <h1 className={`mx-auto max-w-3xl text-4xl leading-[1.05] sm:text-6xl ${T.display}`}>{copy.title || store.name}</h1>
            {copy.subtitle ? <p className={`mx-auto mt-4 max-w-md text-sm leading-6 ${T.muted}`}>{copy.subtitle}</p> : null}
          </div>
        </section>
      ) : null}

      {spot ? (
        <section aria-labelledby="spot" className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <Link href={productHref(store.slug, spot)} className="group relative mx-auto block w-full max-w-lg">
              <span aria-hidden="true" className={`absolute inset-0 translate-x-3 translate-y-3 border ${T.primaryBorder} transition group-hover:translate-x-4 group-hover:translate-y-4`} />
              <span className="relative block aspect-square overflow-hidden bg-black">
                {spotImg ? <Image src={spotImg} alt={spot.name} fill priority sizes="(max-width:768px) 100vw, 512px" className="object-cover" /> : null}
              </span>
            </Link>
            <div className="text-center md:text-left">
              <p className={`text-[11px] uppercase tracking-[0.35em] ${T.primaryText}`}>The spotlight</p>
              <h2 id="spot" className={`mt-4 text-4xl leading-tight sm:text-5xl ${T.display}`}>{spot.name}</h2>
              {spot.description ? <p className={`mx-auto mt-4 line-clamp-3 max-w-md text-sm leading-7 md:mx-0 ${T.muted}`}>{spot.description}</p> : null}
              <p className={`mt-6 text-2xl ${T.primaryText}`}>
                <Price product={spot} currency={store.currency} />
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                <Link href={productHref(store.slug, spot)} className={`border px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition hover:bg-[var(--s-primary)] hover:text-[color:var(--s-primary-ink)] ${T.primaryBorder}`}>
                  View piece
                </Link>
                <ChatButton href={p.whatsappUrl} label={copy.cta} className="h-11 px-6 text-xs uppercase tracking-[0.2em]" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {home && bannerUrls.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-8">
          <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-44 !border-0 sm:h-72 sm:!rounded-none" />
        </div>
      ) : null}

      <section aria-labelledby="coll" className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-8">
        <div className="mb-8 flex items-center gap-5">
          <span className={`h-px flex-1 ${T.line} border-t`} />
          <h2 id="coll" className={`text-2xl uppercase tracking-[0.3em] sm:text-3xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : "The collection")}
          </h2>
          <span className={`h-px flex-1 ${T.line} border-t`} />
        </div>
        <div className="mb-6 flex items-center justify-end gap-4">
          <CurrencyRow currencies={store.activated_currencies ?? []} />
          <span className={`text-[11px] uppercase tracking-[0.2em] ${T.muted}`}>{products.length} pieces</span>
        </div>
        {products.length === 0 ? (
          <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
        ) : rest.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {rest.map((item, i) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="noir" priority={i < 3 && !spot} />
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
