import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProductCard } from "@/components/store/product-card";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { FollowStoreButton } from "@/components/store/follow-store-button";
import { StarRating } from "@/components/store/star-rating";
import { VendorReviewsSection } from "@/components/reviews/vendor-reviews-section";
import { authOptions } from "@/lib/auth";
import {
  getThemeByPreset,
  normalizeStoreTemplate,
  normalizeStorefrontConfig,
  normalizeThemePreset,
} from "@/lib/storefront";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = slug.replace(/[-_]+/g, " ").trim() || "Store";
  return {
    title: `Store - ${label}`,
  };
}

function HeroVisual({
  heroImageUrl,
  storeName,
  className,
}: {
  heroImageUrl: string;
  storeName: string;
  className: string;
}) {
  if (!heroImageUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-sm font-semibold text-white/90 ${className}`}
      >
        Add hero image in dashboard
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white ${className}`}>
      <Image
        src={heroImageUrl}
        alt={`${storeName} hero`}
        fill
        className="object-contain"
        sizes="(max-width: 1024px) 100vw, 60vw"
      />
    </div>
  );
}

function StoreTopBar({
  store,
  primaryColor,
  nicheNames,
  isLoggedIn,
  activeUserId,
  isFollowing,
}: {
  store: StoreRecord;
  primaryColor: string;
  nicheNames: string[];
  isLoggedIn: boolean;
  activeUserId: string | null;
  isFollowing: boolean;
}) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={`${store.name} logo`} fill className="object-cover" sizes="48px" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-slate-500">Logo</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{store.name}</h1>
            <p className="text-xs text-slate-600 sm:text-sm">WhatsApp: {store.whatsapp_number}</p>
            {nicheNames.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nicheNames.slice(0, 4).map((niche) => (
                  <span
                    key={`${store.id}-${niche}`}
                    className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                  >
                    {niche}
                  </span>
                ))}
              </div>
            ) : null}
            <StarRating value={store.rating_avg} count={store.rating_count} accent="yellow" />
          </div>
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
            <span className="text-white">
              Chat vendor
            </span>
          </Link>
        </div>
      </div>
    </header>
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
    <div className="grid grid-cols-2 justify-items-center gap-3 [@media(max-width:320px)]:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
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

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const supabase = createAdminSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<StoreRecord>();

  if (storeError || !store) {
    notFound();
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("store_id", store.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  const { data: storeNiches } = await supabase
    .from("store_niches")
    .select("niche:niche_id(name)")
    .eq("store_id", store.id);

  const nicheNames = Array.from(
    new Set(
      ((storeNiches ?? []) as Array<{ niche?: { name?: string } | null }>)
        .map((row) => row.niche?.name?.trim() ?? "")
        .filter(Boolean),
    ),
  );

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
  const template = normalizeStoreTemplate(store.store_template);
  const themePreset = normalizeThemePreset(store.store_theme_preset);
  const theme = getThemeByPreset(themePreset);
  const config = normalizeStorefrontConfig(store.storefront_config);
  const sectionsOrder = config.sections_order;
  const primaryColor = store.theme_color ?? theme.primary;
  const bannerUrls = config.banner_urls.length > 0
    ? config.banner_urls
    : (config.secondary_banner_url ? [config.secondary_banner_url] : []);
  const mobileEdgeBannerClass =
    "h-44 w-screen max-w-none relative left-1/2 right-1/2 -mx-[50vw] rounded-none border-0 shadow-none sm:static sm:left-auto sm:right-auto sm:mx-0 sm:h-52 sm:w-full sm:max-w-full sm:rounded-xl sm:border sm:border-slate-200 sm:shadow-sm";
  const mobileEdgeBannerTallClass =
    "h-56 w-screen max-w-none relative left-1/2 right-1/2 -mx-[50vw] rounded-none border-0 shadow-none sm:static sm:left-auto sm:right-auto sm:mx-0 sm:w-full sm:max-w-full sm:rounded-xl sm:border sm:border-slate-200 sm:shadow-sm";

  if (template === "fashion_editorial") {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 bg-white px-4 py-6 sm:px-6">
        <StoreTopBar
          store={store}
          primaryColor={primaryColor}
          nicheNames={nicheNames}
          isLoggedIn={Boolean(session?.user?.id)}
          activeUserId={session?.user?.id ?? null}
          isFollowing={isFollowing}
        />
        <section className="-mx-4 grid gap-4 px-4 lg:grid-cols-[1.3fr_1fr] sm:mx-0 sm:px-0">
          <HeroVisual heroImageUrl={config.hero_image_url} storeName={store.name} className="h-72 sm:h-80" />
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editorial Pick</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{config.hero_title}</h2>
            <p className="mt-3 text-sm text-slate-600">{config.hero_subtitle}</p>
            <p className="mt-4 text-sm font-semibold" style={{ color: primaryColor }}>{config.promo_text}</p>
          </article>
        </section>
        {sectionsOrder.map((section) => {
          if (section === "featured_products") {
            return (
              <section key={section} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Collections</h3>
                <ProductGrid products={availableProducts} store={store} template={template} />
              </section>
            );
          }
          if (section === "promo_strip") {
            return (
              <section key={section} className="-mx-4 space-y-3 rounded-none border border-slate-200 bg-slate-50 p-4 sm:mx-0 sm:rounded-xl">
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 bg-slate-50 px-4 py-6 sm:px-6">
        <StoreTopBar
          store={store}
          primaryColor={primaryColor}
          nicheNames={nicheNames}
          isLoggedIn={Boolean(session?.user?.id)}
          activeUserId={session?.user?.id ?? null}
          isFollowing={isFollowing}
        />
        <section
          className="-mx-4 grid gap-4 rounded-none p-4 sm:mx-0 sm:rounded-2xl sm:p-6 lg:grid-cols-[1.5fr_1fr]"
          style={{ backgroundColor: theme.surface }}
        >
          <article className="space-y-3 rounded-xl bg-white/80 p-4 backdrop-blur">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{config.hero_title}</h2>
            <p className="max-w-xl text-sm text-slate-700 sm:text-base">{config.hero_subtitle}</p>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {config.hero_cta_text}
            </button>
          </article>
          <HeroVisual heroImageUrl={config.hero_image_url} storeName={store.name} className="h-72 sm:h-80" />
        </section>
        {sectionsOrder.map((section) => {
          if (section === "featured_products") {
            return (
              <section key={section} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Featured Products</h3>
                <ProductGrid products={availableProducts} store={store} template={template} />
              </section>
            );
          }
          if (section === "promo_strip") {
            return (
              <section key={section} className="-mx-4 grid gap-4 px-4 sm:mx-0 sm:px-0 lg:grid-cols-[1fr_320px]">
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 bg-slate-100 px-4 py-6 sm:px-6">
        <StoreTopBar
          store={store}
          primaryColor={primaryColor}
          nicheNames={nicheNames}
          isLoggedIn={Boolean(session?.user?.id)}
          activeUserId={session?.user?.id ?? null}
          isFollowing={isFollowing}
        />
        <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
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
            <section
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              style={{ borderTopColor: primaryColor, borderTopWidth: 4 }}
            >
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{config.hero_title}</h2>
              <p className="mt-1 text-sm text-slate-600">{config.hero_subtitle}</p>
            </section>
            {sectionsOrder.map((section) => {
              if (section === "featured_products") {
                return (
                  <div key={section}>
                    <ProductGrid products={availableProducts} store={store} template={template} />
                  </div>
                );
              }
              if (section === "promo_strip") {
                return (
                  <section key={section} className="-mx-4 space-y-3 rounded-none border border-slate-200 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl">
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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 bg-slate-50 px-4 py-6 sm:px-6">
      <StoreTopBar
        store={store}
        primaryColor={primaryColor}
        nicheNames={nicheNames}
        isLoggedIn={Boolean(session?.user?.id)}
        activeUserId={session?.user?.id ?? null}
        isFollowing={isFollowing}
      />
      <section
        className="-mx-4 grid gap-4 rounded-none p-4 sm:mx-0 sm:rounded-2xl sm:p-6 lg:grid-cols-[1.2fr_1fr]"
        style={{ backgroundColor: theme.surface }}
      >
        <article className="space-y-3">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {config.promo_text}
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {config.hero_title}
          </h2>
          <p className="max-w-xl text-sm text-slate-700 sm:text-base">{config.hero_subtitle}</p>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {config.hero_cta_text}
          </button>
        </article>
        <HeroVisual heroImageUrl={config.hero_image_url} storeName={store.name} className="h-72 sm:h-80" />
      </section>

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
              <ProductGrid products={availableProducts} store={store} template={template} />
            </section>
          );
        }
        if (section === "promo_strip") {
          return (
            <section key={section} className="-mx-4 space-y-3 rounded-none border border-slate-200 bg-white p-4 shadow-sm sm:mx-0 sm:rounded-xl">
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
