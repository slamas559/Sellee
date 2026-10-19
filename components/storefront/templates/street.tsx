import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import { CategoryNav, ChatButton, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm } from "../controls";
import type { TemplateProps } from "../types";

const INK = "border-[color:var(--s-ink)]";

/**
 * STREETWEAR - oversized condensed type, hard 2px borders, a "latest drop"
 * block and a contact-sheet grid where cells share borders. Loud on purpose.
 */
export function StreetTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const cardStore = { slug: store.slug, currency: store.currency };
  const showHero = !p.isFiltered && products.length > 0;
  const lead = products[0];
  const heroImg = config.hero_image_url || (lead ? (lead.image_urls ?? []).find(Boolean) ?? lead.image_url : null);
  const tickerBits = [copy.promo || "New drop", "Order on WhatsApp", `${p.totalProducts} pieces live`];
  const ticker = Array.from({ length: 6 }, () => tickerBits.join("   //   ")).join("   //   ");
  const stats = [
    store.rating_avg && store.rating_count > 0 ? { v: store.rating_avg.toFixed(1), l: "Rating" } : null,
    p.completedOrdersCount > 0 ? { v: String(p.completedOrdersCount), l: "Delivered" } : null,
    { v: String(p.totalProducts), l: "Pieces" },
  ].filter(Boolean) as Array<{ v: string; l: string }>;

  return (
    <>
      <header className={`border-b-2 ${INK}`}>
        <div className="overflow-hidden whitespace-nowrap bg-[var(--s-ink)] py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white" aria-hidden="true">
          {ticker}
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pb-4 pt-5 sm:px-6">
          <Link href={`${p.storeUrl}/profile`} className="min-w-0 max-w-full">
            <span className={`block break-words uppercase leading-[0.86] tracking-tight text-[clamp(2.75rem,15vw,7.5rem)] ${T.display}`}>{store.name}</span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-widest">
              <VerificationPill tier={effectiveTier(store)} size="sm" />
              {p.nicheNames.slice(0, 3).map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ChatButton href={p.whatsappUrl} label="Order" className="h-10 border-2 border-[color:var(--s-ink)] px-5 uppercase tracking-widest" />
            <FollowAndShare p={p} upper heavy />
          </div>
        </div>
        <div className={`border-t-2 ${INK}`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
            <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="box" className="min-w-0 flex-1 uppercase" />
            <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="box" className="sm:w-60" />
          </div>
        </div>
      </header>

      {showHero ? (
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
          <div className={`grid border-2 ${INK} lg:grid-cols-[1.15fr_1fr]`}>
            <div className={`relative aspect-[4/5] border-b-2 bg-black/5 sm:aspect-[16/11] lg:aspect-auto lg:min-h-[500px] lg:border-b-0 lg:border-r-2 ${INK}`}>
              {heroImg ? <Image src={heroImg} alt={store.name} fill priority sizes="(max-width:1024px) 100vw, 55vw" className="object-cover" /> : null}
              <span className={`absolute left-3 top-3 -rotate-3 border-2 bg-white px-3 py-1 text-lg uppercase ${INK} ${T.display}`}>Latest drop</span>
            </div>
            <div className={`flex flex-col justify-between gap-10 p-5 sm:p-8 ${T.primary}`}>
              <div>
                <h2 className={`uppercase leading-[0.9] text-[clamp(2.4rem,8vw,4.75rem)] ${T.display}`}>{copy.title || lead?.name || store.name}</h2>
                {copy.subtitle ? <p className="mt-4 max-w-sm text-sm font-medium">{copy.subtitle}</p> : null}
              </div>
              <div>
                <a href={p.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-block border-2 border-[color:var(--s-ink)] bg-[var(--s-ink)] px-5 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[5px_5px_0_0_rgba(255,255,255,0.9)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(255,255,255,0.9)]">
                  {copy.cta} &rarr;
                </a>
                <dl className={`mt-8 grid border-t-2 pt-4 ${INK}`} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
                  {stats.map((s) => (
                    <div key={s.l}>
                      <dd className={`text-3xl leading-none sm:text-4xl ${T.display}`}>{s.v}</dd>
                      <dt className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em]">{s.l}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!p.isFiltered && bannerUrls.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-40 !border-2 !border-[color:var(--s-ink)] !shadow-none sm:h-64 sm:!rounded-none" />
        </div>
      ) : null}

      <section id="shop" aria-labelledby="shop-h" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="shop-h" className={`text-4xl uppercase leading-none sm:text-6xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : "Shop all")}
          </h2>
          <div className="flex items-center gap-4">
            <CurrencyRow currencies={store.activated_currencies ?? []} />
            <span className="text-xs font-bold uppercase tracking-widest">{products.length} items</span>
          </div>
        </div>
        {products.length === 0 ? (
          <EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} />
        ) : (
          <div className={`grid grid-cols-2 border-l-2 border-t-2 md:grid-cols-3 lg:grid-cols-4 ${INK}`}>
            {products.map((item, i) => (
              <StoreProductCard key={item.id} product={item} store={cardStore} variant="brutal" index={i} priority={i < 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
