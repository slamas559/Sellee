import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import { buildHref, CategoryNav, ChatButton, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm, StoreLogo, TrustLine } from "../controls";
import { categoryCovers } from "../utils";
import type { TemplateProps } from "../types";

const EQUAL_COLS: Record<number, string> = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

/**
 * HOME & LIVING - warm linen palette, left-aligned serif header, a wide hero
 * photo, "shop by room" tiles built from the vendor's own category photos and
 * landscape product cards.
 */
export function HomeTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const cardStore = { slug: store.slug, currency: store.currency };
  const home = !p.isFiltered;
  const tiles = home ? categoryCovers(products, p.categoryCounts, 5) : [];
  const mosaic = tiles.length === 5;
  const heroImg = config.hero_image_url || null;

  return (
    <>
      <header className={`border-b ${T.line}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-4 sm:px-8">
          <Link href={`${p.storeUrl}/profile`} className="flex min-w-0 items-center gap-3">
            <StoreLogo store={store} size={36} className="rounded-sm" />
            <span className="flex items-center gap-2">
              <span className={`truncate text-3xl leading-none ${T.display}`}>{store.name}</span>
              <VerificationPill tier={effectiveTier(store)} size="sm" />
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="underline" className="hidden w-44 sm:flex" />
            <FollowAndShare p={p} />
          </div>
          <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="text" className="w-full min-w-0 gap-6" />
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="underline" className="w-full sm:hidden" />
        </div>
      </header>

      {home ? (
        <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:py-14">
          <div className="lg:col-span-5">
            {p.nicheNames.length > 0 ? <p className={`mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] ${T.muted}`}>{p.nicheNames.slice(0, 3).join("  ·  ")}</p> : null}
            <h1 className={`text-5xl leading-[1] tracking-tight sm:text-6xl lg:text-7xl ${T.display}`}>{copy.title || store.name}</h1>
            {copy.subtitle ? <p className={`mt-5 max-w-md text-base leading-7 ${T.muted}`}>{copy.subtitle}</p> : null}
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <ChatButton href={p.whatsappUrl} label={copy.cta} className={`h-12 px-6 ${T.r}`} />
              <a href="#new" className="text-sm font-semibold underline underline-offset-[6px]">Browse {p.totalProducts} pieces</a>
            </div>
            <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`mt-6 ${T.muted}`} />
            {copy.promo ? <p className={`mt-6 inline-block px-3 py-1.5 text-xs font-semibold ${T.primarySoft} ${T.primaryText} ${T.r}`}>{copy.promo}</p> : null}
          </div>
          <div className="lg:col-span-7">
            <div className={`relative aspect-[4/3] overflow-hidden ${T.rLg} ${T.primarySoft}`}>
              {heroImg ? (
                <Image src={heroImg} alt={store.name} fill priority sizes="(max-width:1024px) 100vw, 58vw" className="object-cover" />
              ) : products[0]?.image_url ? (
                <Image src={products[0].image_url} alt={products[0].name} fill priority sizes="(max-width:1024px) 100vw, 58vw" className="object-cover" />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {tiles.length >= 2 ? (
        <section aria-labelledby="rooms" className="mx-auto max-w-7xl px-4 pb-6 sm:px-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 id="rooms" className={`text-3xl sm:text-4xl ${T.display}`}>Shop by category</h2>
          </div>
          <div className={`grid grid-cols-2 gap-3 ${mosaic ? "md:grid-cols-4" : EQUAL_COLS[tiles.length] ?? "md:grid-cols-4"}`}>
            {tiles.map((t, i) => {
              const big = mosaic && i === 0;
              return (
                <Link
                  key={t.category}
                  href={buildHref(p.storeHomeHref, { category: t.category })}
                  className={`group relative block overflow-hidden ${T.rLg} ${T.primarySoft} ${big ? "col-span-2 aspect-[16/10] md:row-span-2 md:aspect-auto" : "aspect-square md:aspect-[4/3]"}`}
                >
                  {t.image ? <Image src={t.image} alt="" fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" /> : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-white sm:p-4">
                    <span className={`text-xl leading-none sm:text-2xl ${T.display}`}>{t.category}</span>
                    <span className="text-xs tabular-nums text-white/80">{t.count}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {home && bannerUrls.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
          <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-44 !rounded-[var(--s-r-lg)] sm:h-72" />
        </div>
      ) : null}

      <section id="new" aria-labelledby="catalog" className="mx-auto max-w-7xl scroll-mt-4 px-4 pb-24 pt-10 sm:px-8">
        <div className={`mb-8 flex flex-wrap items-end justify-between gap-3 border-b pb-3 ${T.line}`}>
          <h2 id="catalog" className={`text-3xl sm:text-5xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : "New arrivals")}
          </h2>
          <div className="flex items-center gap-4">
            <CurrencyRow currencies={store.activated_currencies ?? []} />
            <span className={`text-xs ${T.muted}`}>{products.length} pieces</span>
          </div>
        </div>
        {products.length === 0 ? (
          <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((item, i) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="gallery" priority={i < 3} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
