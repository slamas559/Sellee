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
  accent: string; // accent colour shown in the picker card
}> = [
  {
    key: "grocery_promo",
    label: "Market",
    description: "Bold hero, vibrant promo strip, dense product grid — built for high-volume stores.",
    accent: "#10b981",
  },
  {
    key: "fashion_editorial",
    label: "Editorial",
    description: "Full-bleed imagery, typographic hierarchy, curated collection rows.",
    accent: "#0f172a",
  },
  {
    key: "lifestyle_showcase",
    label: "Showcase",
    description: "Split-screen storytelling, horizontal product scroll, feature callouts.",
    accent: "#0ea5e9",
  },
  {
    key: "modern_grid",
    label: "Grid",
    description: "Sidebar navigation, compact card grid — fast, dense, browser-like.",
    accent: "#7c3aed",
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
    label: "Emerald",
    primary: "#059669",
    accent: "#f59e0b",
    surface: "#ecfdf5",
  },
  {
    key: "sunlit_market",
    label: "Sunlit",
    primary: "#16a34a",
    accent: "#facc15",
    surface: "#fefce8",
  },
  {
    key: "midnight_luxe",
    label: "Midnight",
    primary: "#0f172a",
    accent: "#22c55e",
    surface: "#e2e8f0",
  },
  {
    key: "ocean_breeze",
    label: "Ocean",
    primary: "#0e7490",
    accent: "#eab308",
    surface: "#ecfeff",
  },
  {
    key: "rose_boutique",
    label: "Rose",
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