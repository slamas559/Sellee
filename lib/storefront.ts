import type { StoreThemePreset, StorefrontConfig, StoreTemplate, StorefrontSectionId } from "@/types";

export const DEFAULT_STOREFRONT_SECTIONS_ORDER: StorefrontSectionId[] = [
  "featured_products",
  "promo_strip",
  "reviews",
];

export const STOREFRONT_TEMPLATE_OPTIONS: Array<{
  key: StoreTemplate;
  label: string;
  description: string;
  previewClass: string;
}> = [
  {
    key: "grocery_promo",
    label: "Grocery Promo",
    description: "Banner-first deal layout with promo strips and category momentum.",
    previewClass: "from-emerald-100 via-white to-amber-100",
  },
  {
    key: "fashion_editorial",
    label: "Fashion Editorial",
    description: "Clean premium layout with large hero and collection blocks.",
    previewClass: "from-white via-slate-100 to-white",
  },
  {
    key: "lifestyle_showcase",
    label: "Lifestyle Showcase",
    description: "Story-driven rich media sections and visual discovery tiles.",
    previewClass: "from-teal-100 via-emerald-50 to-lime-50",
  },
  {
    key: "modern_grid",
    label: "Modern Grid",
    description: "Dense shopping layout with filter sidebar and fast browsing.",
    previewClass: "from-slate-100 via-white to-slate-100",
  },
];

export const STOREFRONT_THEME_PRESETS: Array<{
  key: StoreThemePreset;
  label: string;
  primary: string;
  accent: string;
  surface: string;
}> = [
  {
    key: "emerald_fresh",
    label: "Emerald Fresh",
    primary: "#059669",
    accent: "#f59e0b",
    surface: "#ecfdf5",
  },
  {
    key: "sunlit_market",
    label: "Sunlit Market",
    primary: "#16a34a",
    accent: "#facc15",
    surface: "#fefce8",
  },
  {
    key: "midnight_luxe",
    label: "Midnight Luxe",
    primary: "#0f172a",
    accent: "#22c55e",
    surface: "#e2e8f0",
  },
  {
    key: "ocean_breeze",
    label: "Ocean Breeze",
    primary: "#0e7490",
    accent: "#eab308",
    surface: "#ecfeff",
  },
  {
    key: "rose_boutique",
    label: "Rose Boutique",
    primary: "#be185d",
    accent: "#f59e0b",
    surface: "#fff1f2",
  },
];

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  hero_title: "Discover trusted products near you",
  hero_subtitle: "Shop from local vendors with fast WhatsApp ordering and live availability.",
  hero_cta_text: "Shop now",
  hero_image_url: "",
  promo_text: "Fresh picks this week",
  secondary_banner_url: "",
  banner_urls: [],
  sections_order: DEFAULT_STOREFRONT_SECTIONS_ORDER,
};

export function normalizeStoreTemplate(value: string | null | undefined): StoreTemplate {
  const normalized = value?.trim() ?? "";
  if (
    normalized === "grocery_promo" ||
    normalized === "fashion_editorial" ||
    normalized === "lifestyle_showcase" ||
    normalized === "modern_grid"
  ) {
    return normalized;
  }

  // Legacy mapping
  if (normalized === "classic") return "grocery_promo";
  if (normalized === "bold") return "modern_grid";
  if (normalized === "minimal") return "fashion_editorial";

  return "grocery_promo";
}

export function normalizeThemePreset(value: string | null | undefined): StoreThemePreset {
  const normalized = value?.trim() ?? "";
  if (
    normalized === "emerald_fresh" ||
    normalized === "sunlit_market" ||
    normalized === "midnight_luxe" ||
    normalized === "ocean_breeze" ||
    normalized === "rose_boutique"
  ) {
    return normalized;
  }
  return "emerald_fresh";
}

export function normalizeStorefrontConfig(
  value: unknown,
): StorefrontConfig {
  const raw = (value as Partial<StorefrontConfig> | null) ?? {};
  const rawBannerUrls = Array.isArray(raw.banner_urls)
    ? raw.banner_urls
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    : [];
  const legacyBanner = String(
    raw.secondary_banner_url ?? DEFAULT_STOREFRONT_CONFIG.secondary_banner_url,
  ).trim();
  const normalizedBanners = Array.from(
    new Set(
      rawBannerUrls.length > 0
        ? rawBannerUrls
        : legacyBanner
          ? [legacyBanner]
          : [],
    ),
  ).slice(0, 8);
  const rawOrder = Array.isArray(raw.sections_order) ? raw.sections_order : [];
  const normalizedOrder = [
    ...new Set(
      rawOrder.filter((item): item is StorefrontSectionId =>
        DEFAULT_STOREFRONT_SECTIONS_ORDER.includes(item as StorefrontSectionId),
      ),
    ),
  ];

  for (const key of DEFAULT_STOREFRONT_SECTIONS_ORDER) {
    if (!normalizedOrder.includes(key)) {
      normalizedOrder.push(key);
    }
  }

  return {
    hero_title: String(raw.hero_title ?? DEFAULT_STOREFRONT_CONFIG.hero_title),
    hero_subtitle: String(raw.hero_subtitle ?? DEFAULT_STOREFRONT_CONFIG.hero_subtitle),
    hero_cta_text: String(raw.hero_cta_text ?? DEFAULT_STOREFRONT_CONFIG.hero_cta_text),
    hero_image_url: String(raw.hero_image_url ?? DEFAULT_STOREFRONT_CONFIG.hero_image_url),
    promo_text: String(raw.promo_text ?? DEFAULT_STOREFRONT_CONFIG.promo_text),
    secondary_banner_url:
      normalizedBanners[0] ??
      String(raw.secondary_banner_url ?? DEFAULT_STOREFRONT_CONFIG.secondary_banner_url),
    banner_urls: normalizedBanners,
    sections_order: normalizedOrder,
  };
}

export function getThemeByPreset(preset: StoreThemePreset) {
  return (
    STOREFRONT_THEME_PRESETS.find((item) => item.key === preset) ??
    STOREFRONT_THEME_PRESETS[0]
  );
}
