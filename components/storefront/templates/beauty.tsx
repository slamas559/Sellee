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

/**
 * BEAUTY - soft, centred and rating-led. Round logo + pill navigation, a hero
 * panel with a floating message card, category bubbles that use the vendor's
 * own product photos, a "most loved" shelf, then portrait cards.
 */
export function BeautyTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const cardStore = { slug: store.slug, currency: store.currency };
  const home = !p.isFiltered;
  const covers = home && p.categories.length >= 2 ? categoryCovers(products, p.categoryCounts, 8) : [];
  const rated = [...products]
    .filter((x) => x.rating_count > 0 && x.rating_avg)
    .sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg) || b.rating_count - a.rating_count);
  const shelfIsLoved = rated.length >= 3;
  const shelf = home && products.length >= 6 ? (shelfIsLoved ? rated : products).slice(0, 4) : [];

  return (
    <>
      <header className="mx-auto max-w-5xl px-4 pb-2 pt-6 text-center sm:pt-9">
        <div className="flex justify-end"><FollowAndShare p={p} /></div>
        <Link href={`${p.storeUrl}/profile`} className="mx-auto -mt-3 inline-flex flex-col items-center gap-3">
          <StoreLogo store={store} size={64} className="rounded-full ring-4 ring-white" />
          <span className={`flex items-center gap-2 text-4xl italic leading-none sm:text-5xl ${T.display}`}>
            {store.name}
            <VerificationPill tier={effectiveTier(store)} size="sm" />
          </span>
        </Link>
        <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`mt-3 ${T.muted}`} />
        <div className="mt-5 flex flex-col items-center gap-3">
          <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="pill" className="max-w-full sm:justify-center" />
          <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search products" className="w-full max-w-md" />
        </div>
      </header>

      {home && (config.hero_image_url || copy.title || copy.promo) ? (
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:pt-8">
          <div className={`relative isolate flex min-h-[380px] items-end overflow-hidden rounded-[2.25rem] sm:min-h-[460px] ${T.primarySoft}`}>
            {config.hero_image_url ? (
              <Image src={config.hero_image_url} alt={store.name} fill priority sizes="(max-width:1152px) 100vw, 1152px" className="object-cover" />
            ) : (
              <div aria-hidden="true" className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/60 blur-2xl" />
            )}
            <div className="relative m-3 max-w-md rounded-[1.75rem] bg-white/85 p-5 shadow-lg backdrop-blur-md sm:m-8 sm:p-7">
              {copy.promo ? <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.2em] ${T.primaryText}`}>{copy.promo}</p> : null}
              <h1 className={`text-3xl leading-tight sm:text-4xl ${T.display}`}>{copy.title || `Meet ${store.name}`}</h1>
              {copy.subtitle ? <p className={`mt-2 text-sm leading-6 ${T.muted}`}>{copy.subtitle}</p> : null}
              <ChatButton href={p.whatsappUrl} label={copy.cta} className="mt-4 h-11 rounded-full px-6" />
            </div>
          </div>
        </section>
      ) : null}

      {covers.length > 0 ? (
        <section aria-label="Shop by category" className="mx-auto max-w-6xl px-4 pt-10">
          <div className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] sm:justify-center">
            {covers.map((c) => (
              <Link key={c.category} href={buildHref(p.storeHomeHref, { category: c.category })} className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-24">
                <span className={`relative h-[72px] w-[72px] overflow-hidden rounded-full ring-2 ring-white transition group-hover:ring-[color:var(--s-primary)] sm:h-20 sm:w-20 ${T.primarySoft}`}>
                  {c.image ? <Image src={c.image} alt="" fill sizes="80px" className="object-cover" /> : <span className={`flex h-full w-full items-center justify-center text-xl ${T.display}`}>{c.category.charAt(0)}</span>}
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-tight">{c.category}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {shelf.length > 0 ? (
        <section aria-labelledby="shelf" className="mx-auto max-w-6xl px-4 pt-12">
          <div className="mb-5 text-center">
            <h2 id="shelf" className={`text-3xl italic sm:text-4xl ${T.display}`}>{shelfIsLoved ? "Most loved" : "New in"}</h2>
            <p className={`mt-1 text-xs ${T.muted}`}>{shelfIsLoved ? "Rated highest by customers" : "Fresh on the shelf"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {shelf.map((item, i) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="beauty" priority={i < 2} />
            ))}
          </div>
        </section>
      ) : null}

      {home && bannerUrls.length > 0 ? (
        <div className="mx-auto max-w-6xl px-4 pt-12">
          <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-40 !rounded-[2rem] sm:h-64" />
        </div>
      ) : null}

      <section aria-labelledby="all" className="mx-auto max-w-6xl px-4 pb-20 pt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="all" className={`text-3xl italic sm:text-4xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : "All products")}
          </h2>
          <div className="flex items-center gap-3">
            <CurrencyRow currencies={store.activated_currencies ?? []} />
            <span className={`text-xs ${T.muted}`}>{products.length} items</span>
          </div>
        </div>
        {products.length === 0 ? (
          <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((item) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="beauty" />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
