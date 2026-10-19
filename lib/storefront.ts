import type { StoreThemePreset, StorefrontConfig, StoreTemplate, StorefrontSectionId } from "@/types";

export const DEFAULT_STOREFRONT_SECTIONS_ORDER: StorefrontSectionId[] = [
  "featured_products",
  "promo_strip",
];

export const FREE_STORE_TEMPLATE: StoreTemplate = "grocery_promo";

export type StoreIndustry = "fashion" | "beauty" | "tech" | "home" | "jewelry" | "food" | "general";

export const STORE_INDUSTRIES: Array<{ key: StoreIndustry; label: string }> = [
  { key: "fashion", label: "Fashion" },
  { key: "beauty", label: "Beauty" },
  { key: "tech", label: "Electronics" },
  { key: "home", label: "Home & decor" },
  { key: "jewelry", label: "Jewelry & watches" },
  { key: "food", label: "Food & groceries" },
  { key: "general", label: "Other" },
];

const INDUSTRY_KEYWORDS: Record<Exclude<StoreIndustry, "general">, string[]> = {
  fashion: ["fashion", "cloth", "wear", "apparel", "shoe", "sneaker", "footwear", "bag", "tailor", "ankara", "thrift", "dress", "native"],
  beauty: ["beauty", "cosmetic", "skincare", "skin care", "makeup", "make-up", "hair", "wig", "salon", "personal care", "grooming"],
  tech: ["electronic", "phone", "gadget", "computer", "laptop", "appliance", "tech", "mobile", "gaming", "solar", "auto part", "spare part"],
  home: ["home", "furniture", "decor", "kitchen", "interior", "household", "bedding", "curtain", "lighting"],
  jewelry: ["jewel", "watch", "perfume", "fragrance", "gold", "luxury", "bead"],
  food: ["food", "grocer", "provision", "fresh", "drink", "beverage", "bakery", "snack", "supermarket", "farm", "meat", "fruit", "vegetable"],
};

/** Maps a vendor's niche names to the industries they belong to (keyword match). */
export function detectIndustries(names: string[]): StoreIndustry[] {
  const found = new Set<StoreIndustry>();
  for (const raw of names) {
    const name = raw.toLowerCase();
    for (const [industry, words] of Object.entries(INDUSTRY_KEYWORDS) as Array<[StoreIndustry, string[]]>) {
      // Match at the start of a word so "hair" does not match "chair".
      if (words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name))) found.add(industry);
    }
  }
  return [...found];
}

export const STOREFRONT_TEMPLATE_OPTIONS: Array<{
  key: StoreTemplate;
  label: string;
  description: string;
  accent: string; // accent colour shown in the picker card
  /** Industries this template suits best (drives picker filter + "Recommended"). */
  bestFor: StoreIndustry[];
}> = [
  {
    key: FREE_STORE_TEMPLATE,
    label: "Market",
    description: "Search-first app bar, deals shelf and a dense grid. Best for groceries, provisions and high-volume shops.",
    accent: "#10b981",
    bestFor: ["food", "general"],
  },
  {
    key: "fashion_editorial",
    label: "Editorial",
    description: "Serif masthead, full-bleed hero and a tall-image collection. Best for fashion, tailors and boutiques.",
    accent: "#0f172a",
    bestFor: ["fashion", "beauty"],
  },
  {
    key: "lifestyle_showcase",
    label: "Showcase",
    description: "Split hero with an arched photo and a staggered product wall. Best for beauty, home and lifestyle brands.",
    accent: "#0ea5e9",
    bestFor: ["beauty", "home", "general"],
  },
  {
    key: "modern_grid",
    label: "Grid",
    description: "Filter rail, sorting and spec-style cards. Best for phones, gadgets, parts and large catalogues.",
    accent: "#7c3aed",
    bestFor: ["tech", "general"],
  },
  {
    key: "street_drop",
    label: "Streetwear",
    description: "Oversized type, hard borders and a contact-sheet grid. Best for sneakers, drops and urban fashion.",
    accent: "#111111",
    bestFor: ["fashion"],
  },
  {
    key: "soft_beauty",
    label: "Beauty",
    description: "Soft pastels, category bubbles and rating-led cards. Best for skincare, makeup and hair.",
    accent: "#e11d74",
    bestFor: ["beauty"],
  },
  {
    key: "home_living",
    label: "Home & Living",
    description: "Warm linen tones, shop-by-room tiles and wide photos. Best for furniture, decor and kitchenware.",
    accent: "#a16207",
    bestFor: ["home"],
  },
  {
    key: "noir_gallery",
    label: "Noir Gallery",
    description: "Dark, spaced-out luxury with a spotlight piece. Best for jewelry, watches and fragrance.",
    accent: "#b8892d",
    bestFor: ["jewelry"],
  },
  {
    key: "lookbook",
    label: "Lookbook",
    description: "Sticky side menu and an editorial image mosaic. Best for designers and tailors showing collections.",
    accent: "#111111",
    bestFor: ["fashion"],
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
    normalized === "modern_grid" ||
    normalized === "street_drop" ||
    normalized === "soft_beauty" ||
    normalized === "home_living" ||
    normalized === "noir_gallery" ||
    normalized === "lookbook"
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