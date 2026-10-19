import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { DisplayCurrencyProvider } from "@/components/marketplace/currency-switcher";
import { StoreVisitTracker } from "@/components/store/store-visit-tracker";
import { STOREFRONT_TEMPLATES } from "@/components/storefront/registry";
import { PoweredBySellee } from "@/components/storefront/powered-by";
import { ThemeScope } from "@/components/storefront/theme-scope";
import { normalizeSort, type SortKey, type TemplateProps } from "@/components/storefront/types";
import { authOptions } from "@/lib/auth";
import { canUseAllStoreTemplates, hasFeature } from "@/lib/plans";
import { getStorefrontPublicDataCached } from "@/lib/public-cache";
import {
  FREE_STORE_TEMPLATE,
  getThemeByPreset,
  normalizeStorefrontConfig,
  normalizeThemePreset,
} from "@/lib/storefront";
import { cleanCopy, resolveTemplate, safePrimary, whatsappHref } from "@/lib/storefront-theme";
import { storeUrl as buildStoreUrl } from "@/lib/store-url";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";

type StorePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
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
  const imageUrl = `https://sellee.store/v/${slug}/opengraph-image`;
  const canonical = `/v/${slug}`;
  const logoUrl = store?.logo_url ?? null;

  return {
    title: `${label} Store`,
    description,
    alternates: { canonical },
    icons: logoUrl
      ? {
          icon: logoUrl,
          apple: logoUrl,
        }
      : {
          icon: "/icon.png",
          apple: "/icon.png",
        },
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

function sortProducts(list: ProductRecord[], sort: SortKey): ProductRecord[] {
  const copy = [...list];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case "price_desc":
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case "top_rated":
      return copy.sort(
        (a, b) =>
          Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0) ||
          (b.rating_count ?? 0) - (a.rating_count ?? 0),
      );
    default:
      return copy; // already newest-first from the data loader
  }
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const supabase = createAdminSupabaseClient();

  const storefrontData = await getStorefrontPublicDataCached(slug);
  const store = storefrontData.store as StoreRecord | null;
  if (!store) notFound();

  const promoPricingEnabled = await hasFeature(store.vendor_id, "promo_pricing");
  const products = promoPricingEnabled
    ? storefrontData.products
    : storefrontData.products.map((product) => ({ ...product, compare_at_price: null }));

  const storeHomeHref = buildStoreUrl(slug);
  const isOwnerViewing = session?.user?.id === store.vendor_id;

  let isFollowing = false;
  if (session?.user?.id) {
    const { data: me } = await supabase.from("users").select("phone").eq("id", session.user.id).maybeSingle();
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
  const categoryCounts: Record<string, number> = {};
  for (const product of availableProducts) {
    const category = product.category?.trim();
    if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }
  const categories = Object.keys(categoryCounts);

  const q = query.q?.trim().toLowerCase() ?? "";
  const selectedCategory = query.category?.trim() ?? "";
  const sort = normalizeSort(query.sort);
  const filteredProducts = sortProducts(
    availableProducts.filter((p) => {
      if (selectedCategory && (p.category ?? "") !== selectedCategory) return false;
      if (!q) return true;
      return `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q);
    }),
    sort,
  );

  const canUseAllTemplates = await canUseAllStoreTemplates(store.vendor_id);
  const template = resolveTemplate(canUseAllTemplates ? store.store_template : FREE_STORE_TEMPLATE);
  const theme = getThemeByPreset(normalizeThemePreset(store.store_theme_preset));
  const primary = safePrimary(store.theme_color ?? theme.primary);
  const config = normalizeStorefrontConfig(store.storefront_config);
  const storeUrl = buildStoreUrl(slug);
  const bannerUrls =
    config.banner_urls.length > 0
      ? config.banner_urls
      : config.secondary_banner_url
        ? [config.secondary_banner_url]
        : [];

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
    totalProducts: availableProducts.length,
    nicheNames: storefrontData.nicheNames,
    completedOrdersCount: storefrontData.completedOrdersCount,
    config,
    copy: {
      title: cleanCopy(config.hero_title),
      subtitle: cleanCopy(config.hero_subtitle),
      promo: cleanCopy(config.promo_text),
      cta: cleanCopy(config.hero_cta_text) || "Order on WhatsApp",
    },
    categories,
    categoryCounts,
    selectedCategory,
    query: q,
    sort,
    isFiltered: Boolean(q || selectedCategory || sort !== "newest"),
    follow: {
      isLoggedIn: Boolean(session?.user?.id),
      isOwner: Boolean(session?.user?.id && session.user.id === store.vendor_id),
      isFollowing,
    },
    storeUrl,
    storeHomeHref,
    bannerUrls,
    whatsappUrl: whatsappHref(store.whatsapp_number, `Hi ${store.name}, I found your store on Sellee.`),
  };

  const Template = STOREFRONT_TEMPLATES[template];

  return (
    <DisplayCurrencyProvider authorizedCurrency={store.currency} activatedCurrencies={store.activated_currencies ?? []}>
      <StoreVisitTracker storeId={store.id} isOwnerViewing={isOwnerViewing} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <ThemeScope template={template} primary={primary}>
        <Template {...props} />
        <PoweredBySellee />
      </ThemeScope>
    </DisplayCurrencyProvider>
  );
}
