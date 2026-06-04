import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProductCard } from "@/components/store/product-card";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { FollowStoreButton } from "@/components/store/follow-store-button";
import { SocialShareActions } from "@/components/shared/social-share-actions";
import { StarRating } from "@/components/store/star-rating";
import { VendorReviewsSection } from "@/components/reviews/vendor-reviews-section";
import { authOptions } from "@/lib/auth";
import {
  getThemeByPreset,
  normalizeStoreTemplate,
  normalizeStorefrontConfig,
  normalizeThemePreset,
} from "@/lib/storefront";
import { getStorefrontPublicDataCached } from "@/lib/public-cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";

type StorePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
};

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminSupabaseClient();
  const { data: store } = await supabase
    .from("stores")
    .select("name, slug, is_active, storefront_config, logo_url, city, state, country")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  const label = store?.name || slug.replace(/[-_]+/g, " ").trim() || "Store";
  const config = normalizeStorefrontConfig(store?.storefront_config);
  const description =
    config.hero_subtitle ||
    `Browse products from ${label} on Sellee and order through WhatsApp-powered workflows.`;
  const imageUrl = config.hero_image_url || store?.logo_url || "https://sellee.store/opengraph-image.png";
  const canonical = `/store/${slug}`;

  return {
    title: `${label} Store`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${label} Store | Sellee`,
      description,
      url: `https://sellee.store${canonical}`,
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} Store | Sellee`,
      description,
      images: [imageUrl],
    },
  };
}

// ─── Shared search/filter controls ──────────────────────────────────────────

function StoreSearchBar({
  slug,
  query,
  selectedCategory,
  categories,
}: {
  slug: string;
  query: string;
  selectedCategory: string;
  categories: string[];
}) {
  return (
    <div className="space-y-2">
      <form className="flex flex-nowrap items-center gap-2" action={`/store/${slug}`}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Search this store…"
          className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
        />
        {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
        <button
          type="submit"
          className="shrink-0 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Search
        </button>
      </form>
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Link
            href={`/store/${slug}${query ? `?q=${encodeURIComponent(query)}` : ""}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              !selectedCategory
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/store/${slug}?category=${encodeURIComponent(cat)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TEMPLATE 1: Market ──────────────────────────────────────────────────────
// Big hero banner, vibrant colour accent bar, tag-based filters, dense 2-4 col grid.

function MarketTemplate({
  store,
  products,
  nicheNames,
  primaryColor,
  config,
  categories,
  selectedCategory,
  query,
  isLoggedIn,
  activeUserId,
  isFollowing,
  storeUrl,
  bannerUrls,
  storeJsonLd,
}: TemplateProps) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <main className="min-h-screen bg-slate-50">

        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
          />
          {config.hero_image_url && (
            <Image
              src={config.hero_image_url}
              alt={store.name}
              fill
              className="object-cover opacity-25"
              sizes="100vw"
            />
          )}
          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {store.logo_url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-white/40 shadow-lg sm:h-20 sm:w-20">
                    <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="80px" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/20 text-2xl font-black text-white sm:h-20 sm:w-20">
                    {store.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{store.name}</h1>
                  <p className="mt-0.5 text-sm text-white/80">{config.promo_text}</p>
                  {nicheNames.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {nicheNames.slice(0, 4).map((n) => (
                        <span key={n} className="rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{n}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2">
                    <StarRating value={store.rating_avg} count={store.rating_count} accent="yellow" />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FollowStoreButton storeId={store.id} storeSlug={store.slug} isLoggedIn={isLoggedIn} isOwner={Boolean(activeUserId && activeUserId === store.vendor_id)} initialFollowing={isFollowing} compact />
                <a href={`https://wa.me/${store.whatsapp_number}`} className="rounded-full border border-white/60 bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30"><span className="text-white">Chat vendor</span></a>
                <SocialShareActions mode="menu" compact url={storeUrl} title={`${store.name} on Sellee`} text={`Shop at ${store.name} on Sellee.`} triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/20 text-white backdrop-blur hover:bg-white/30" triggerLabel="Share" />
              </div>
            </div>
            {config.hero_title && (
              <div className="mt-6 max-w-xl">
                <p className="text-xl font-bold text-white sm:text-2xl">{config.hero_title}</p>
                {config.hero_subtitle && <p className="mt-1 text-sm text-white/80">{config.hero_subtitle}</p>}
              </div>
            )}
          </div>
        </section>

        {/* Accent bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88, transparent)` }} />

        {/* Banner carousel */}
        {bannerUrls.length > 0 && (
          <div className="mx-auto max-w-7xl px-2 pt-4 sm:px-4">
            <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-44 rounded-2xl sm:h-56" />
          </div>
        )}

        {/* Products */}
        <div className="mx-auto max-w-7xl px-2 py-3 sm:px-4">
          <div className="mb-4">
            <StoreSearchBar slug={store.slug} query={query} selectedCategory={selectedCategory} categories={categories} />
          </div>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">No products match your search.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 justify-items-center gap-1 [@media(max-width:320px)]:grid-cols-1 sm:mt-5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <div key={p.id} className="w-full max-w-[320px] space-y-2">
                  <ProductCard product={p} template="grocery_promo" store={{ name: store.name, slug: store.slug, logo_url: store.logo_url, rating_avg: store.rating_avg, rating_count: store.rating_count }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mx-auto max-w-7xl px-2 pb-12 sm:px-4" id="vendor-reviews">
          <VendorReviewsSection storeId={store.id} initialRatingAvg={store.rating_avg} initialRatingCount={store.rating_count} />
        </div>
      </main>
    </>
  );
}

// ─── TEMPLATE 2: Editorial ───────────────────────────────────────────────────
// Dark hero, full-bleed image, minimal serif-feeling type, horizontal scroll row.

function EditorialTemplate({
  store,
  products,
  nicheNames,
  primaryColor,
  config,
  categories,
  selectedCategory,
  query,
  isLoggedIn,
  activeUserId,
  isFollowing,
  storeUrl,
  bannerUrls,
  storeJsonLd,
}: TemplateProps) {
  const featured = products.slice(0, 4);
  const rest = products.slice(4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <main className="min-h-screen bg-white">

        {/* Full-bleed dark hero */}
        <section className="relative min-h-[420px] overflow-hidden bg-slate-950 sm:min-h-[520px]">
          {config.hero_image_url && (
            <Image src={config.hero_image_url} alt={store.name} fill className="object-cover opacity-40" sizes="100vw" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950" />

          {/* Top bar */}
          <div className="relative flex items-center justify-between px-2 pt-5 sm:px-8">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/30">
                  <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="36px" />
                </div>
              ) : null}
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">{store.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <FollowStoreButton storeId={store.id} storeSlug={store.slug} isLoggedIn={isLoggedIn} isOwner={Boolean(activeUserId && activeUserId === store.vendor_id)} initialFollowing={isFollowing} compact />
              <SocialShareActions mode="menu" compact url={storeUrl} title={store.name} text={`Shop at ${store.name}.`} triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20" triggerLabel="Share" />
            </div>
          </div>

          {/* Hero copy */}
          <div className="relative flex mt-1 min-h-[340px] flex-col justify-end px-2 pb-10 sm:px-8 sm:pb-14">
            {nicheNames.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {nicheNames.slice(0, 3).map((n) => (
                  <span key={n} style={{ borderColor: `${primaryColor}80`}} className="rounded-full border bg-white/10 px-3 py-0.5 text-xs font-semibold backdrop-blur text-white/50">{n}</span>
                ))}
              </div>
            )}
            <h1 className="max-w-2xl text-4xl font-black leading-none tracking-tight text-white sm:text-6xl">{config.hero_title || store.name}</h1>
            {config.hero_subtitle && <p className="mt-3 max-w-xl text-base text-white/70">{config.hero_subtitle}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={`https://wa.me/${store.whatsapp_number}`} className="rounded-full px-5 py-2 text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}><span className="text-white">{config.hero_cta_text || "Order now"}</span></a>
              <StarRating value={store.rating_avg} count={store.rating_count} accent="yellow" size="md" />
            </div>
          </div>
        </section>

        {/* Promo label */}
        {config.promo_text && (
          <div className="border-y border-slate-100 bg-slate-50">
            <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-3 sm:px-6">
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: primaryColor }}>New</span>
              <div className="flex gap-8 overflow-hidden text-sm font-semibold text-slate-600">
                {[config.promo_text, config.promo_text, config.promo_text].map((t, i) => (
                  <span key={i} className="shrink-0">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Featured horizontal scroll */}
        {featured.length > 0 && (
          <div className="mx-auto max-w-7xl px-2 py-6 sm:px-4">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Featured</p>
            <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
              {featured.map((p) => (
                <div key={p.id} className="w-[56vw] max-w-[280px] shrink-0 sm:max-w-[280px]">
                  <ProductCard product={p} template="fashion_editorial" store={{ name: store.name, slug: store.slug, logo_url: store.logo_url, rating_avg: store.rating_avg, rating_count: store.rating_count }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Banner */}
        {bannerUrls.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-8">
            <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-48 rounded-3xl sm:h-64" />
          </div>
        )}

        {/* All products */}
        <div className="mx-auto max-w-7xl px-2 pb-8 sm:px-4">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{rest.length > 0 ? "All products" : "Products"}</p>
            <div className="w-full max-w-md">
              <StoreSearchBar slug={store.slug} query={query} selectedCategory={selectedCategory} categories={categories} />
            </div>
          </div>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">No products found.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 justify-items-center gap-1 [@media(max-width:320px)]:grid-cols-1 sm:mt-5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {(rest.length > 0 ? rest : products).map((p) => (
                <div key={p.id} className="w-full max-w-[320px] space-y-2">
                  <ProductCard product={p} template="fashion_editorial" store={{ name: store.name, slug: store.slug, logo_url: store.logo_url, rating_avg: store.rating_avg, rating_count: store.rating_count }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mx-auto max-w-7xl border-t border-slate-100 px-2 py-10 sm:px-4" id="vendor-reviews">
          <VendorReviewsSection storeId={store.id} initialRatingAvg={store.rating_avg} initialRatingCount={store.rating_count} />
        </div>
      </main>
    </>
  );
}

// ─── TEMPLATE 3: Showcase ────────────────────────────────────────────────────
// Split-screen hero, soft tones, horizontal product scroll, feature stat callouts.

function ShowcaseTemplate({
  store,
  products,
  nicheNames,
  primaryColor,
  config,
  categories,
  selectedCategory,
  query,
  isLoggedIn,
  activeUserId,
  isFollowing,
  storeUrl,
  bannerUrls,
  storeJsonLd,
  surfaceColor,
}: TemplateProps) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <main className="min-h-screen" style={{ backgroundColor: surfaceColor }}>

        {/* Split-screen hero */}
        <section className="mx-auto grid max-w-7xl px-2 py-4 sm:px-4 sm:py-10 lg:grid-cols-[1fr_1fr] lg:gap-8 lg:items-center">
          {/* Left: copy */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {store.logo_url ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-xl shadow-md">
                  <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="48px" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl font-black text-xl text-white" style={{ backgroundColor: primaryColor }}>{store.name.charAt(0)}</div>
              )}
              <span className="text-sm font-semibold text-slate-500">{store.name}</span>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {config.hero_title || store.name}
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">{config.hero_subtitle}</p>
            {nicheNames.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {nicheNames.slice(0, 4).map((n) => (
                  <span key={n} className="rounded-full border px-3 py-1 text-xs font-semibold text-slate-700" style={{ borderColor: `${primaryColor}50`, backgroundColor: `${primaryColor}12` }}>{n}</span>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={`https://wa.me/${store.whatsapp_number}`} className="rounded-full px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:opacity-90" style={{ backgroundColor: primaryColor }}><span className="text-white">{config.hero_cta_text || "Chat & Order"}</span></a>
              <FollowStoreButton storeId={store.id} storeSlug={store.slug} isLoggedIn={isLoggedIn} isOwner={Boolean(activeUserId && activeUserId === store.vendor_id)} initialFollowing={isFollowing} />
              <SocialShareActions mode="menu" compact url={storeUrl} title={store.name} text={`Shop at ${store.name}.`} triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" triggerLabel="Share" />
            </div>
            <div className="mt-5">
              <StarRating value={store.rating_avg} count={store.rating_count} accent="yellow" size="md" />
            </div>
          </div>

          {/* Right: hero image + stat chips */}
          <div className="relative mt-8 lg:mt-0">
            {config.hero_image_url ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl">
                <Image src={config.hero_image_url} alt={store.name} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-3xl" style={{ backgroundColor: `${primaryColor}20` }} />
            )}
            {/* Floating chip */}
            <div className="absolute -bottom-4 -left-4 rounded-2xl border border-white bg-white p-3 shadow-xl sm:p-4">
              <p className="text-2xl font-black text-slate-900">{store.rating_count}+</p>
              <p className="text-xs font-medium text-slate-500">Reviews</p>
            </div>
            <div className="absolute -right-4 top-6 rounded-2xl border border-white bg-white p-3 shadow-xl sm:p-4">
              <p className="text-2xl font-black" style={{ color: primaryColor }}>{products.length}</p>
              <p className="text-xs font-medium text-slate-500">Products</p>
            </div>
          </div>
        </section>

        {/* Promo strip */}
        {config.promo_text && (
          <div className="py-3" style={{ backgroundColor: primaryColor }}>
            <p className="text-center text-sm font-semibold text-white">{config.promo_text}</p>
          </div>
        )}

        {/* Horizontal product scroll */}
        {products.length > 0 && (
          <div className="mx-auto max-w-7xl px-2 py-4 sm:px-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold text-slate-900">Products</p>
              <span className="text-sm text-slate-500">{products.length} items</span>
            </div>
            {/* Filters */}
            <div className="mb-4">
              <StoreSearchBar slug={store.slug} query={query} selectedCategory={selectedCategory} categories={categories} />
            </div>
            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">No products found.</div>
            ) : (
              <div className="mt-4 grid grid-cols-2 justify-items-center gap-1 [@media(max-width:320px)]:grid-cols-1 sm:mt-5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <div key={p.id} className="w-full max-w-[320px] space-y-2">
                    <ProductCard product={p} template="lifestyle_showcase" store={{ name: store.name, slug: store.slug, logo_url: store.logo_url, rating_avg: store.rating_avg, rating_count: store.rating_count }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Banner */}
        {bannerUrls.length > 0 && (
          <div className="mx-auto max-w-7xl px-2 pb-6 sm:px-4">
            <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-44 rounded-3xl sm:h-60" />
          </div>
        )}

        {/* Reviews */}
        <div className="mx-auto max-w-7xl px-2 pb-12 sm:px-4" id="vendor-reviews">
          <VendorReviewsSection storeId={store.id} initialRatingAvg={store.rating_avg} initialRatingCount={store.rating_count} />
        </div>
      </main>
    </>
  );
}

// ─── TEMPLATE 4: Grid ────────────────────────────────────────────────────────
// Sidebar navigation panel + compact card grid. App-like, utilitarian, fast.

function GridTemplate({
  store,
  products,
  nicheNames,
  primaryColor,
  config,
  categories,
  selectedCategory,
  query,
  isLoggedIn,
  activeUserId,
  isFollowing,
  storeUrl,
  bannerUrls,
  storeJsonLd,
}: TemplateProps) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <main className="min-h-screen bg-slate-100">

        {/* Compact header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <div className="relative h-9 w-9 overflow-hidden rounded-lg">
                  <Image src={store.logo_url} alt={store.name} fill className="object-cover" sizes="36px" />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg font-black text-white text-sm" style={{ backgroundColor: primaryColor }}>{store.name.charAt(0)}</div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">{store.name}</p>
                <StarRating value={store.rating_avg} count={store.rating_count} size="sm" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`https://wa.me/${store.whatsapp_number}`} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}><span className="text-white">Chat & Order</span></a>
              <FollowStoreButton storeId={store.id} storeSlug={store.slug} isLoggedIn={isLoggedIn} isOwner={Boolean(activeUserId && activeUserId === store.vendor_id)} initialFollowing={isFollowing} compact />
              <SocialShareActions mode="menu" compact url={storeUrl} title={store.name} text={`Shop at ${store.name}.`} triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" triggerLabel="Share" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-2 py-5 sm:px-4 lg:grid lg:grid-cols-[220px_1fr] lg:gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Store info */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {config.hero_image_url && (
                  <div className="relative mb-3 h-32 overflow-hidden rounded-lg">
                    <Image src={config.hero_image_url} alt={store.name} fill className="object-cover" sizes="220px" />
                  </div>
                )}
                <p className="text-sm font-semibold text-slate-900">{config.hero_title || store.name}</p>
                {config.hero_subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{config.hero_subtitle}</p>}
                {config.promo_text && (
                  <p className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: primaryColor }}>{config.promo_text}</p>
                )}
              </div>

              {/* Niches */}
              {nicheNames.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Categories</p>
                  <div className="space-y-1">
                    <Link
                      href={`/store/${store.slug}${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition ${!selectedCategory ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
                      style={!selectedCategory ? { backgroundColor: primaryColor } : {}}
                    >
                      All products
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        href={`/store/${store.slug}?category=${encodeURIComponent(cat)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition ${selectedCategory === cat ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
                        style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Banner */}
              {bannerUrls.length > 0 && (
                <BannerCarousel banners={bannerUrls} storeName={store.name} className="h-36 rounded-xl" />
              )}
            </div>
          </aside>

          {/* Main content */}
          <div>
            {/* Mobile search */}
            <div className="mb-4 lg:hidden">
              <StoreSearchBar slug={store.slug} query={query} selectedCategory={selectedCategory} categories={categories} />
            </div>
            {/* Desktop search bar */}
            <div className="mb-4 hidden lg:block">
              <form className="flex gap-2" action={`/store/${store.slug}`}>
                <input name="q" defaultValue={query} placeholder="Search products…" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2" />
                {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
                <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>Search</button>
              </form>
            </div>

            {/* Stats bar */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Products</p>
                <p className="text-lg font-black text-slate-900">{products.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Rating</p>
                <p className="text-lg font-black" style={{ color: primaryColor }}>{store.rating_avg ? store.rating_avg.toFixed(1) : "New"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Reviews</p>
                <p className="text-lg font-black text-slate-900">{store.rating_count}</p>
              </div>
            </div>

            {/* Grid */}
            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No products match your search.</div>
            ) : (
              <div className="mt-4 grid grid-cols-2 justify-items-center gap-1 [@media(max-width:320px)]:grid-cols-1 sm:mt-5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <div key={p.id} className="w-full max-w-[320px] space-y-2">
                    <ProductCard key={p.id} product={p} template="modern_grid" store={{ name: store.name, slug: store.slug, logo_url: store.logo_url, rating_avg: store.rating_avg, rating_count: store.rating_count }} />
                  </div>
                ))}
              </div>
            )}

            {/* Reviews */}
            <div className="mt-8" id="vendor-reviews">
              <VendorReviewsSection storeId={store.id} initialRatingAvg={store.rating_avg} initialRatingCount={store.rating_count} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ─── Shared props type ────────────────────────────────────────────────────────

type TemplateProps = {
  store: StoreRecord;
  products: ProductRecord[];
  nicheNames: string[];
  primaryColor: string;
  surfaceColor: string;
  config: ReturnType<typeof normalizeStorefrontConfig>;
  categories: string[];
  selectedCategory: string;
  query: string;
  isLoggedIn: boolean;
  activeUserId: string | null;
  isFollowing: boolean;
  storeUrl: string;
  bannerUrls: string[];
  storeJsonLd: object;
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const supabase = createAdminSupabaseClient();

  const storefrontData = await getStorefrontPublicDataCached(slug);
  const store = storefrontData.store as StoreRecord | null;
  if (!store) notFound();

  const products = storefrontData.products;
  const nicheNames = storefrontData.nicheNames;

  let isFollowing = false;
  if (session?.user?.id) {
    const { data: me } = await supabase.from("users").select("phone").eq("id", session.user.id).maybeSingle();
    if (me?.phone) {
      const { data: followRow } = await supabase.from("customer_store_follows").select("id").eq("store_id", store.id).eq("customer_phone", String(me.phone)).maybeSingle();
      isFollowing = Boolean(followRow?.id);
    }
  }

  const availableProducts = (products ?? []) as ProductRecord[];
  const storeCategories = Array.from(new Set(availableProducts.map((p) => p.category?.trim() ?? "").filter(Boolean)));
  const q = query.q?.trim().toLowerCase() ?? "";
  const selectedCategory = query.category?.trim() ?? "";
  const filteredProducts = availableProducts.filter((p) => {
    if (selectedCategory && (p.category ?? "") !== selectedCategory) return false;
    if (!q) return true;
    return `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q);
  });

  const template = normalizeStoreTemplate(store.store_template);
  const themePreset = normalizeThemePreset(store.store_theme_preset);
  const theme = getThemeByPreset(themePreset);
  const config = normalizeStorefrontConfig(store.storefront_config);
  const primaryColor = store.theme_color ?? theme.primary;
  const surfaceColor = theme.surface;
  const appBaseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const storeUrl = `${appBaseUrl}/store/${slug}`;
  const bannerUrls = config.banner_urls.length > 0 ? config.banner_urls : config.secondary_banner_url ? [config.secondary_banner_url] : [];

  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    url: storeUrl,
    image: config.hero_image_url || store.logo_url || undefined,
    telephone: store.whatsapp_number || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: store.city || undefined,
      addressRegion: store.state || undefined,
      addressCountry: store.country || undefined,
    },
    aggregateRating:
      typeof store.rating_avg === "number" && store.rating_count > 0
        ? { "@type": "AggregateRating", ratingValue: store.rating_avg, reviewCount: store.rating_count }
        : undefined,
  };

  const props: TemplateProps = {
    store,
    products: filteredProducts,
    nicheNames,
    primaryColor,
    surfaceColor,
    config,
    categories: storeCategories,
    selectedCategory,
    query: q,
    isLoggedIn: Boolean(session?.user?.id),
    activeUserId: session?.user?.id ?? null,
    isFollowing,
    storeUrl,
    bannerUrls,
    storeJsonLd,
  };

  if (template === "fashion_editorial") return <EditorialTemplate {...props} />;
  if (template === "lifestyle_showcase") return <ShowcaseTemplate {...props} />;
  if (template === "modern_grid") return <GridTemplate {...props} />;
  return <MarketTemplate {...props} />;
}