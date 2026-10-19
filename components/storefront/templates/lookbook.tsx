import Image from "next/image";
import Link from "next/link";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { VerificationPill } from "@/components/store/verification-pill";
import { effectiveTier } from "@/lib/verification-tier-constants";
import { T } from "@/lib/storefront-theme";
import { StoreProductCard } from "../product-cards";
import { CategoryNav, ChatButton, CurrencyRow, EmptyProducts, FollowAndShare, SearchForm, StoreLogo, TrustLine } from "../controls";
import { chunk } from "../utils";
import type { TemplateProps } from "../types";

/**
 * LOOKBOOK - a sticky side panel (store, categories, search) beside an image
 * mosaic. Rows alternate between "one big + two small" and its mirror so the
 * page reads like a printed lookbook. No card chrome, captions sit on the photo.
 */
export function LookbookTemplate(p: TemplateProps) {
  const { store, products, config, copy, bannerUrls } = p;
  const cardStore = { slug: store.slug, currency: store.currency };
  const home = !p.isFiltered;
  const rows = chunk(products, 3);

  return (
    <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Side panel (stacks on top on mobile) */}
      <aside className={`border-b p-4 sm:p-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r ${T.line}`}>
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href={`${p.storeUrl}/profile`} className="flex min-w-0 items-center gap-3 lg:block">
            <StoreLogo store={store} size={40} className="lg:mb-5" />
            <span className="block min-w-0">
              <span className={`block truncate text-2xl uppercase leading-none tracking-tight lg:whitespace-normal lg:text-4xl ${T.display}`}>{store.name}</span>
              <span className="mt-2 hidden items-center gap-2 lg:flex"><VerificationPill tier={effectiveTier(store)} size="sm" /></span>
            </span>
          </Link>
          <div className="lg:mt-5"><FollowAndShare p={p} upper /></div>
        </div>
        <TrustLine rating={store.rating_avg} ratingCount={store.rating_count} orders={p.completedOrdersCount} className={`mt-3 lg:mt-4 ${T.muted}`} />

        <SearchForm action={p.storeHomeHref} query={p.query} category={p.selectedCategory} sort={p.sort} placeholder="Search" variant="underline" className="mt-4 lg:mt-7" />

        <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="box" className="mt-4 lg:hidden" />
        <CategoryNav base={p.storeHomeHref} categories={p.categories} selected={p.selectedCategory} query={p.query} sort={p.sort} variant="list" counts={p.categoryCounts} total={p.totalProducts} className="mt-7 hidden lg:flex" />

        <div className="mt-6 lg:mt-auto lg:pt-8">
          <ChatButton href={p.whatsappUrl} label={copy.cta} className="h-11 w-full whitespace-nowrap px-4 text-xs uppercase tracking-[0.12em]" />
          <div className="mt-3"><CurrencyRow currencies={store.activated_currencies ?? []} /></div>
        </div>
      </aside>

      <div className="min-w-0 pb-20">
        {home && (config.hero_image_url || copy.title) ? (
          <section className="relative flex min-h-[340px] items-end overflow-hidden bg-neutral-900 sm:min-h-[520px]">
            {config.hero_image_url ? <Image src={config.hero_image_url} alt={store.name} fill priority sizes="(max-width:1024px) 100vw, 75vw" className="object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="relative p-5 text-white sm:p-10">
              {copy.promo ? <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-white/75">{copy.promo}</p> : null}
              <h1 className={`max-w-2xl text-4xl uppercase leading-[0.95] tracking-tight sm:text-7xl ${T.display}`}>{copy.title || store.name}</h1>
              {copy.subtitle ? <p className="mt-4 max-w-md text-sm leading-6 text-white/85">{copy.subtitle}</p> : null}
            </div>
          </section>
        ) : null}

        <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-8 sm:px-6">
          <h2 className={`text-2xl uppercase tracking-tight sm:text-3xl ${T.display}`}>
            {p.selectedCategory || (p.query ? `“${p.query}”` : "Collection")}
          </h2>
          <span className={`text-xs uppercase tracking-[0.2em] ${T.muted}`}>{products.length} looks</span>
        </div>

        {products.length === 0 ? (
          <div className="px-4 sm:px-6"><EmptyProducts isFiltered={p.isFiltered} clearHref={p.storeHomeHref} /></div>
        ) : (
          <div className="space-y-3 px-4 sm:space-y-4 sm:px-6">
            {rows.map((row, r) => {
              const [big, ...stack] = row;
              const flip = r % 2 === 1;
              const base = r * 3;
              return (
                <div key={big.id} className="grid gap-3 sm:gap-4 md:grid-cols-3">
                  <div className={`relative aspect-[4/5] md:col-span-2 ${flip ? "md:order-2" : ""}`}>
                    <StoreProductCard product={big} store={cardStore} variant="lookbook" index={base} priority={r === 0} className="absolute inset-0" />
                  </div>
                  {stack.length > 0 ? (
                    <div className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-1 ${stack.length === 1 ? "md:grid-rows-1" : "md:grid-rows-2"} ${flip ? "md:order-1" : ""}`}>
                      {stack.map((item, i) => (
                        <div key={item.id} className="relative aspect-[3/4] md:aspect-auto">
                          <StoreProductCard product={item} store={cardStore} variant="lookbook" index={base + i + 1} className="absolute inset-0" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {home && bannerUrls.length > 0 ? (
          <div className="px-4 pt-6 sm:px-6">
            <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-40 sm:h-64 sm:!rounded-none" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
