import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProductCard } from "@/components/store/product-card";
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
  const label = slug.replace(/[-_]+/g, " ").trim() || "Store";
  return {
    title: `Store - ${label}`,
  };
}

function StoreHero({
  store,
  primaryColor,
  nicheNames,
  isLoggedIn,
  activeUserId,
  isFollowing,
  storeUrl,
  heroTitle,
  heroSubtitle,
  template,
}: {
  store: StoreRecord;
  primaryColor: string;
  nicheNames: string[];
  isLoggedIn: boolean;
  activeUserId: string | null;
  isFollowing: boolean;
  storeUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  template: StoreRecord["store_template"];
}) {
  const heroImageUrl = normalizeStorefrontConfig(store.storefront_config).hero_image_url;
  const templateMode = normalizeStoreTemplate(template);
  const heroHeightClass =
    templateMode === "fashion_editorial"
      ? "h-[300px] sm:h-[380px] lg:h-[430px]"
      : templateMode === "modern_grid"
        ? "h-[280px] sm:h-[360px] lg:h-[410px]"
        : "h-[290px] sm:h-[370px] lg:h-[420px]";
  const overlayClass =
    templateMode === "modern_grid"
      ? "absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/45 to-slate-900/15"
      : templateMode === "fashion_editorial"
        ? "absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10"
        : "absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent";
  const motionClass =
    templateMode === "fashion_editorial"
      ? "storefront-anim-fade"
      : templateMode === "modern_grid"
        ? "storefront-anim-slide"
        : templateMode === "lifestyle_showcase"
          ? "storefront-anim-zoom"
          : "storefront-anim-fade";

  return (
    <section className={`relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden rounded-none border-y border-slate-200 shadow-sm ${motionClass}`}>
      <div className={`relative ${heroHeightClass}`}>
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={`${store.name} hero`}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-200 text-sm font-semibold text-slate-600">
            Add hero image in dashboard
          </div>
        )}
        <div className={overlayClass} />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/50 bg-white/20 sm:h-14 sm:w-14">
                  {store.logo_url ? (
                    <Image src={store.logo_url} alt={`${store.name} logo`} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-white">Logo</div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">{store.name}</h1>
                  <p className="text-xs text-white/85 sm:text-sm">{heroTitle}</p>
                </div>
              </div>
              <p className="max-w-xl text-sm text-white/90 sm:text-base lg:text-lg">{heroSubtitle}</p>
              {nicheNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {nicheNames.slice(0, 6).map((niche) => (
                    <span
                      key={`${store.id}-${niche}`}
                      className="inline-flex rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur"
                    >
                      {niche}
                    </span>
                  ))}
                </div>
              ) : null}
              <StarRating value={store.rating_avg} count={store.rating_count} accent="yellow" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FollowStoreButton
                storeId={store.id}
                storeSlug={store.slug}
                isLoggedIn={isLoggedIn}
                isOwner={Boolean(activeUserId && activeUserId === store.vendor_id)}
                initialFollowing={isFollowing}
              />
              <Link
                href={`https://wa.me/${store.whatsapp_number}`}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Chat vendor
              </Link>
              <SocialShareActions
                mode="menu"
                compact
                url={storeUrl}
                title={`${store.name} on Sellee`}
                text={`Check out ${store.name} on Sellee.`}
                triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/20 text-white backdrop-blur hover:bg-white/35"
                triggerLabel="Share store"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductGrid({
  products,
  store,
  template,
}: {
  products: ProductRecord[];
  store: StoreRecord;
  template: StoreRecord["store_template"];
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No products available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 justify-items-center gap-3 px-2 [@media(max-width:320px)]:grid-cols-1 sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="w-full max-w-[320px]">
          <ProductCard
            product={product}
            template={template}
            store={{
              name: store.name,
              slug: store.slug,
              logo_url: store.logo_url,
              rating_avg: store.rating_avg,
              rating_count: store.rating_count,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const supabase = createAdminSupabaseClient();

  const storefrontData = await getStorefrontPublicDataCached(slug);
  const store = storefrontData.store as StoreRecord | null;
  if (!store) {
    notFound();
  }
  const products = storefrontData.products;
  const nicheNames = storefrontData.nicheNames;

  let isFollowing = false;
  if (session?.user?.id) {
    const { data: me } = await supabase
      .from("users")
      .select("phone")
      .eq("id", session.user.id)
      .maybeSingle();
    if (me?.phone) {
      const { data: followRow } = await supabase
        .from("customer_store_follows")
        .select("id")
        .eq("store_id", store.id)
        .eq("customer_phone", String(me.phone))
        .maybeSingle();
      isFollowing = Boolean(followRow?.id);
    }
  }

  const availableProducts = (products ?? []) as ProductRecord[];
  const storeCategories = Array.from(
    new Set(
      availableProducts
        .map((product) => product.category?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  const q = query.q?.trim().toLowerCase() ?? "";
  const selectedCategory = query.category?.trim() ?? "";
  const filteredProducts = availableProducts.filter((product) => {
    if (selectedCategory && (product.category ?? "") !== selectedCategory) return false;
    if (!q) return true;
    const name = product.name.toLowerCase();
    const description = (product.description ?? "").toLowerCase();
    const category = (product.category ?? "").toLowerCase();
    return name.includes(q) || description.includes(q) || category.includes(q);
  });
  const template = normalizeStoreTemplate(store.store_template);
  const bodyMotionClass =
    template === "fashion_editorial"
      ? "storefront-anim-fade"
      : template === "modern_grid"
        ? "storefront-anim-slide"
        : template === "lifestyle_showcase"
          ? "storefront-anim-zoom"
          : "storefront-anim-fade";
  const themePreset = normalizeThemePreset(store.store_theme_preset);
  const theme = getThemeByPreset(themePreset);
  const config = normalizeStorefrontConfig(store.storefront_config);
  const sectionsOrder = config.sections_order;
  const primaryColor = store.theme_color ?? theme.primary;
  const appBaseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const storeUrl = `${appBaseUrl}/store/${slug}`;
  const bannerUrls = config.banner_urls.length > 0
    ? config.banner_urls
    : (config.secondary_banner_url ? [config.secondary_banner_url] : []);
  const mobileEdgeBannerClass =
    "h-44 w-screen max-w-none relative left-1/2 right-1/2 -mx-[50vw] rounded-none border-0 shadow-none sm:static sm:left-auto sm:right-auto sm:mx-0 sm:h-52 sm:w-full sm:max-w-full sm:rounded-xl sm:border sm:border-slate-200 sm:shadow-sm";
  const mobileEdgeBannerTallClass =
    "h-56 w-screen max-w-none relative left-1/2 right-1/2 -mx-[50vw] rounded-none border-0 shadow-none sm:static sm:left-auto sm:right-auto sm:mx-0 sm:w-full sm:max-w-full sm:rounded-xl sm:border sm:border-slate-200 sm:shadow-sm";

  const storefrontControls = (
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:space-y-3 sm:p-4">
      <form className="flex flex-nowrap items-center gap-2" action={`/store/${slug}`}>
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Search this store..."
          className="min-w-0 flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring-2 sm:px-4"
        />
        {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
        <button className="shrink-0 rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:px-4">
          Search
        </button>
      </form>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href={`/store/${slug}${query.q ? `?q=${encodeURIComponent(query.q)}` : ""}`}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            !selectedCategory
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          All
        </Link>
        {storeCategories.map((category) => (
          <Link
            key={category}
            href={`/store/${slug}?category=${encodeURIComponent(category)}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              selectedCategory === category
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {category}
          </Link>
        ))}
      </div>
    </section>
  );

  if (template === "fashion_editorial") {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 bg-white px-0 py-0 sm:px-6 sm:pb-6 sm:pt-0">
        <StoreHero
          store={store}
          primaryColor={primaryColor}
          nicheNames={nicheNames}
          isLoggedIn={Boolean(session?.user?.id)}
          activeUserId={session?.user?.id ?? null}
          isFollowing={isFollowing}
          storeUrl={storeUrl}
          heroTitle={config.hero_title}
          heroSubtitle={config.hero_subtitle}
          template={template}
        />
        <div className={`px-2 pt-2 sm:px-0 sm:pt-4 ${bodyMotionClass}`}>{storefrontControls}</div>
        {sectionsOrder.map((section) => {
          if (section === "featured_products") {
            return (
              <section key={section} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Collections</h3>
                <div className={bodyMotionClass}>
                  <ProductGrid products={filteredProducts} store={store} template={template} />
                </div>
              </section>
            );
          }
          if (section === "promo_strip") {
            return (
              <section key={section} className="mx-0 space-y-3 rounded-none border border-slate-200 bg-slate-50 p-4 sm:rounded-xl lg:hidden">
                <p className="text-sm font-semibold text-slate-700">{config.promo_text}</p>
                <BannerCarousel banners={bannerUrls} storeName={store.name} className={mobileEdgeBannerClass} />
              </section>
            );
          }
          return (
            <section key={section} id="vendor-reviews">
              <VendorReviewsSection
                storeId={store.id}
                initialRatingAvg={store.rating_avg}
                initialRatingCount={store.rating_count}
              />
            </section>
          );
        })}
      </main>
    );
  }

  if (template === "lifestyle_showcase") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 bg-slate-50 px-0 py-0 sm:px-6 sm:pb-6 sm:pt-0">
        <StoreHero
          store={store}
          primaryColor={primaryColor}
          nicheNames={nicheNames}
          isLoggedIn={Boolean(session?.user?.id)}
          activeUserId={session?.user?.id ?? null}
          isFollowing={isFollowing}
          storeUrl={storeUrl}
          heroTitle={config.hero_title}
          heroSubtitle={config.hero_subtitle}
          template={template}
        />
        <div className={`px-2 pt-2 sm:px-0 sm:pt-4 ${bodyMotionClass}`}>{storefrontControls}</div>
        {sectionsOrder.map((section) => {
          if (section === "featured_products") {
            return (
              <section key={section} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Featured Products</h3>
                <div className={bodyMotionClass}>
                  <ProductGrid products={filteredProducts} store={store} template={template} />
                </div>
              </section>
            );
          }
          if (section === "promo_strip") {
            return (
              <section key={section} className="mx-0 grid gap-4 px-0 lg:hidden">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Promo</p>
                  <p className="mt-2 text-sm text-slate-700">{config.promo_text}</p>
                </article>
                <BannerCarousel banners={bannerUrls} storeName={store.name} className={mobileEdgeBannerTallClass} />
              </section>
            );
          }
          return (
            <section key={section} id="vendor-reviews">
              <VendorReviewsSection
                storeId={store.id}
                initialRatingAvg={store.rating_avg}
                initialRatingCount={store.rating_count}
              />
            </section>
          );
        })}
      </main>
    );
  }

  if (template === "modern_grid") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 bg-slate-100 px-0 py-0 sm:px-6 sm:pb-6 sm:pt-0">
        <StoreHero
          store={store}
          primaryColor={primaryColor}
          nicheNames={nicheNames}
          isLoggedIn={Boolean(session?.user?.id)}
          activeUserId={session?.user?.id ?? null}
          isFollowing={isFollowing}
          storeUrl={storeUrl}
          heroTitle={config.hero_title}
          heroSubtitle={config.hero_subtitle}
          template={template}
        />
        <div className={`px-2 pt-2 sm:px-0 sm:pt-4 ${bodyMotionClass}`}>{storefrontControls}</div>
        <section className="mx-2 grid gap-4 sm:mx-0 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Browse</p>
            <p className="text-xs text-slate-600">{config.promo_text}</p>
            <div className="space-y-2 pt-2">
              {["All products", "Top rated", "Recently added", "On discount"].map((item) => (
                <div key={item} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </aside>
          <div className="space-y-4">
            {sectionsOrder.map((section) => {
              if (section === "featured_products") {
                return (
                  <div key={section}>
                    <div className={bodyMotionClass}>
                      <ProductGrid products={filteredProducts} store={store} template={template} />
                    </div>
                  </div>
                );
              }
              if (section === "promo_strip") {
                return (
                  <section key={section} className="mx-0 space-y-3 rounded-none border border-slate-200 bg-white p-4 shadow-sm sm:rounded-xl lg:hidden">
                    <p className="text-sm text-slate-700">{config.promo_text}</p>
                    <BannerCarousel banners={bannerUrls} storeName={store.name} className={mobileEdgeBannerClass} />
                  </section>
                );
              }
              return (
                <section key={section} id="vendor-reviews">
                  <VendorReviewsSection
                    storeId={store.id}
                    initialRatingAvg={store.rating_avg}
                    initialRatingCount={store.rating_count}
                  />
                </section>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  // Default: grocery promo
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 bg-slate-50 px-0 py-0 sm:px-6 sm:pb-6 sm:pt-0">
      <StoreHero
        store={store}
        primaryColor={primaryColor}
        nicheNames={nicheNames}
        isLoggedIn={Boolean(session?.user?.id)}
        activeUserId={session?.user?.id ?? null}
        isFollowing={isFollowing}
        storeUrl={storeUrl}
        heroTitle={config.hero_title}
        heroSubtitle={config.hero_subtitle}
        template={template}
      />
      <div className={`px-2 pt-2 sm:px-0 sm:pt-4 ${bodyMotionClass}`}>{storefrontControls}</div>

      {sectionsOrder.map((section) => {
        if (section === "featured_products") {
          return (
            <section key={section} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Top products</h3>
                <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline">
                  Back home
                </Link>
              </div>
              <div className={bodyMotionClass}>
                <ProductGrid products={filteredProducts} store={store} template={template} />
              </div>
            </section>
          );
        }
        if (section === "promo_strip") {
          return (
            <section key={section} className="mx-0 space-y-3 rounded-none border border-slate-200 bg-white p-4 shadow-sm sm:rounded-xl lg:hidden">
              <p className="text-sm font-semibold text-slate-800">{config.promo_text}</p>
              <BannerCarousel banners={bannerUrls} storeName={store.name} className={mobileEdgeBannerClass} />
            </section>
          );
        }
        return (
          <section key={section} id="vendor-reviews">
            <VendorReviewsSection
              storeId={store.id}
              initialRatingAvg={store.rating_avg}
              initialRatingCount={store.rating_count}
            />
          </section>
        );
      })}
    </main>
  );
}
