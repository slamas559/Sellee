import type { ProductRecord, StoreRecord, StorefrontConfig } from "@/types";
import type { TemplateProps } from "@/components/storefront/types";
import { cleanCopy, safePrimary, type TemplateKey } from "@/lib/storefront-theme";

/**
 * Builds the props the real storefront templates need, for the dashboard's
 * live preview. Anything the vendor hasn't added yet (logo, hero image,
 * products, copy) is filled with clearly-labelled sample content that is
 * generated locally: no network requests, nothing that looks like real stock.
 */

export type SampleFlavor = "fashion" | "beauty" | "tech" | "home" | "jewelry" | "market" | "general";

export const TEMPLATE_FLAVOR: Record<TemplateKey, SampleFlavor> = {
  grocery_promo: "market",
  fashion_editorial: "fashion",
  lifestyle_showcase: "general",
  modern_grid: "tech",
  street_drop: "fashion",
  soft_beauty: "beauty",
  home_living: "home",
  noir_gallery: "jewelry",
  lookbook: "fashion",
};

type SampleItem = { c: string; n: string; p: number; was?: number; r?: [number, number]; b?: string; stock?: number };

const CATALOG: Record<SampleFlavor, SampleItem[]> = {
  fashion: [
    { c: "Dresses", n: "Linen Wrap Dress", p: 18500, was: 24000, r: [4.8, 21] },
    { c: "Tops", n: "Cotton Boxy Tee", p: 8500 },
    { c: "Bags", n: "Leather Crossbody", p: 28000, r: [4.7, 12] },
    { c: "Dresses", n: "Ankara Midi Dress", p: 22000, stock: 3 },
    { c: "Shoes", n: "Canvas Sneakers", p: 21000, r: [4.6, 9] },
    { c: "Tops", n: "Silk Camisole", p: 12500, was: 15000 },
    { c: "Bags", n: "Raffia Tote", p: 16000 },
    { c: "Shoes", n: "Leather Slides", p: 14500, stock: 0 },
    { c: "Accessories", n: "Beaded Belt", p: 6500 },
  ],
  beauty: [
    { c: "Skincare", n: "Vitamin C Serum", p: 9500, r: [4.9, 38] },
    { c: "Makeup", n: "Glow Foundation", p: 11500, was: 13500, r: [4.7, 24] },
    { c: "Hair", n: "Argan Hair Oil", p: 6000, r: [4.8, 16] },
    { c: "Skincare", n: "Shea Body Butter", p: 5500, r: [4.6, 11] },
    { c: "Makeup", n: "Matte Lip Kit", p: 6800 },
    { c: "Skincare", n: "Daily SPF 50", p: 8200, r: [4.5, 7] },
    { c: "Hair", n: "Silk Bonnet", p: 4200 },
    { c: "Makeup", n: "Setting Powder", p: 7200, was: 8500 },
    { c: "Hair", n: "Edge Control Gel", p: 3500 },
  ],
  tech: [
    { c: "Phones", n: "Android Phone 128GB", p: 185000, was: 205000, b: "Nova", r: [4.6, 31], stock: 4 },
    { c: "Audio", n: "Wireless Earbuds", p: 18500, b: "Volt", r: [4.4, 58] },
    { c: "Phones", n: "Budget Smartphone 64GB", p: 95000, b: "Nova", stock: 12 },
    { c: "Audio", n: "Bluetooth Speaker", p: 24000, was: 28000, b: "Volt", r: [4.7, 19] },
    { c: "Accessories", n: "Fast Charger 20W", p: 6500, b: "Volt", stock: 40 },
    { c: "Audio", n: "Over-ear Headphones", p: 32000, b: "Kora", r: [4.5, 14], stock: 2 },
    { c: "Accessories", n: "Power Bank 20,000mAh", p: 17500, b: "Kora", r: [4.6, 27] },
    { c: "Accessories", n: "Braided USB-C Cable", p: 2500, stock: 0 },
    { c: "Accessories", n: "Shockproof Phone Case", p: 3500, b: "Kora", stock: 25 },
  ],
  home: [
    { c: "Living", n: "Boucle Armchair", p: 145000, was: 170000, r: [4.8, 9] },
    { c: "Kitchen", n: "Ceramic Dinner Set", p: 38000, r: [4.7, 15] },
    { c: "Decor", n: "Woven Wall Basket", p: 15500 },
    { c: "Living", n: "Rattan Side Table", p: 48000 },
    { c: "Kitchen", n: "Wooden Serving Board", p: 12500, r: [4.6, 8] },
    { c: "Decor", n: "Brass Table Lamp", p: 42000, was: 49000 },
    { c: "Living", n: "Linen Throw Pillow", p: 9500 },
    { c: "Kitchen", n: "Stoneware Mug Set", p: 11000 },
    { c: "Decor", n: "Handmade Rug", p: 78000, r: [4.9, 6] },
  ],
  jewelry: [
    { c: "Necklaces", n: "Pearl Drop Necklace", p: 38000, r: [4.9, 17] },
    { c: "Rings", n: "Signet Ring", p: 45000 },
    { c: "Earrings", n: "Hoop Earrings", p: 24000, r: [4.8, 22] },
    { c: "Watches", n: "Classic Leather Watch", p: 85000, was: 98000 },
    { c: "Necklaces", n: "Gold Chain", p: 56000 },
    { c: "Rings", n: "Stackable Band Set", p: 32000, r: [4.7, 10] },
    { c: "Earrings", n: "Stud Set", p: 18500 },
    { c: "Necklaces", n: "Initial Pendant", p: 28000 },
    { c: "Watches", n: "Minimal Mesh Watch", p: 72000 },
  ],
  market: [
    { c: "Groceries", n: "Long Grain Rice 25kg", p: 42000, was: 46000 },
    { c: "Groceries", n: "Vegetable Oil 5L", p: 14500 },
    { c: "Fresh", n: "Fresh Tomato Basket", p: 6500, was: 8000 },
    { c: "Drinks", n: "Malt Drink 6-pack", p: 4800 },
    { c: "Groceries", n: "Spaghetti Pack", p: 1800, was: 2200 },
    { c: "Household", n: "Detergent 2kg", p: 5200 },
    { c: "Fresh", n: "Plantain Bunch", p: 3500 },
    { c: "Drinks", n: "Bottled Water 12-pack", p: 2600, was: 3000 },
    { c: "Household", n: "Tissue 10-pack", p: 3900 },
  ],
  general: [
    { c: "Gifts", n: "Handmade Soy Candle", p: 6500, r: [4.8, 14] },
    { c: "Home", n: "Woven Storage Basket", p: 12500 },
    { c: "Gifts", n: "Gift Hamper Box", p: 24000, was: 28000, r: [4.9, 20] },
    { c: "Accessories", n: "Printed Scarf", p: 7500 },
    { c: "Home", n: "Ceramic Planter", p: 9800 },
    { c: "Gifts", n: "Custom Notebook", p: 4500, r: [4.6, 8] },
    { c: "Accessories", n: "Beaded Bracelet", p: 5500 },
    { c: "Home", n: "Linen Table Runner", p: 11000, was: 13500 },
    { c: "Accessories", n: "Canvas Tote", p: 8500 },
  ],
};

const SAMPLE_COPY: Record<SampleFlavor, { title: string; subtitle: string; promo: string }> = {
  fashion: { title: "Your headline goes here", subtitle: "A short line about your brand and what makes your pieces different.", promo: "Free delivery this week" },
  beauty: { title: "Glow, your way", subtitle: "A short line about your products and who they are for.", promo: "Free gift with every order" },
  tech: { title: "Genuine gadgets, fair prices", subtitle: "A short line about warranty, delivery and why customers trust you.", promo: "Warranty on every device" },
  home: { title: "Make your space feel like yours", subtitle: "A short line about your pieces and how you make or source them.", promo: "Free delivery on large orders" },
  jewelry: { title: "Pieces made to be kept", subtitle: "A short line about your craft, materials and finish.", promo: "Complimentary gift wrapping" },
  market: { title: "Fresh stock, every week", subtitle: "A short line about what you sell and how fast you deliver.", promo: "Free delivery over a set amount" },
  general: { title: "Your headline goes here", subtitle: "A short line about your store and what makes it special.", promo: "Order on WhatsApp today" },
};

// ── colour helpers ──────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const h = safePrimary(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, s * 100, l * 100];
}

/** A soft, abstract placeholder tinted from the vendor's colour. Tagged "SAMPLE". */
export function sampleImage(seed: number, primary: string, kind: "product" | "wide" = "product"): string {
  const [h, s] = hexToHsl(primary);
  const hue = (h + ((seed * 37) % 80) - 25 + 360) % 360;
  const sat = Math.max(14, Math.min(48, s));
  const w = kind === "wide" ? 1600 : 600;
  const hgt = kind === "wide" ? 900 : 750;
  const a = `hsl(${hue} ${sat}% ${86 - (seed % 3) * 4}%)`;
  const b = `hsl(${(hue + 28) % 360} ${sat}% ${74 - (seed % 4) * 3}%)`;
  const cx = w * (0.3 + ((seed * 13) % 40) / 100);
  const cy = hgt * (0.34 + ((seed * 7) % 20) / 100);
  const r = Math.min(w, hgt) * (0.2 + ((seed * 5) % 12) / 100);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${hgt}' viewBox='0 0 ${w} ${hgt}'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
    `<rect width='${w}' height='${hgt}' fill='url(#g)'/>` +
    `<circle cx='${cx}' cy='${cy}' r='${r}' fill='rgba(255,255,255,0.38)'/>` +
    `<rect x='${w * 0.2}' y='${hgt * 0.66}' width='${w * 0.6}' height='${hgt * 0.17}' rx='${hgt * 0.04}' fill='rgba(0,0,0,0.09)'/>` +
    `<text x='${w * 0.04}' y='${hgt - w * 0.04}' font-family='Arial,sans-serif' font-size='${Math.round(w * 0.034)}' letter-spacing='${Math.round(w * 0.008)}' fill='rgba(0,0,0,0.32)'>SAMPLE</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ── builder ─────────────────────────────────────────────────────────────────

export type PreviewProductInput = Pick<
  ProductRecord,
  "id" | "name" | "category" | "price" | "compare_at_price" | "image_url" | "image_urls" | "rating_avg" | "rating_count" | "stock_count"
> &
  Partial<Pick<ProductRecord, "slug" | "description" | "brand">>;

export type PreviewInput = {
  template: TemplateKey;
  primary: string;
  name: string;
  slug?: string | null;
  logoUrl: string;
  heroUrl: string;
  bannerUrls: string[];
  currency: string;
  activatedCurrencies: string[];
  whatsapp: string;
  copy: { title: string; subtitle: string; promo: string; cta: string };
  products: PreviewProductInput[];
  nicheNames: string[];
  rating?: { avg: number | null; count: number } | null;
  completedOrders?: number;
};

export type PreviewPayload = {
  template: TemplateKey;
  primary: string;
  props: TemplateProps;
  /** What was filled with sample content, so the UI can say so honestly. */
  sample: { logo: boolean; hero: boolean; banner: boolean; products: number; copy: boolean; storeName: boolean; ratings: boolean };
};

const TARGET_PRODUCTS = 9;

export function buildPreviewPayload(input: PreviewInput): PreviewPayload {
  const primary = safePrimary(input.primary);
  const flavor = TEMPLATE_FLAVOR[input.template];
  const sampleCopy = SAMPLE_COPY[flavor];

  const storeName = input.name.trim() || "Your Store";
  const copy = {
    title: cleanCopy(input.copy.title),
    subtitle: cleanCopy(input.copy.subtitle),
    promo: cleanCopy(input.copy.promo),
    cta: cleanCopy(input.copy.cta) || "Order on WhatsApp",
  };
  const copyIsSample = !copy.title && !copy.subtitle && !copy.promo;
  const finalCopy = copyIsSample ? { ...copy, ...sampleCopy } : copy;

  const hero = input.heroUrl.trim();
  const banners = input.bannerUrls.map((u) => u.trim()).filter(Boolean);
  const heroImage = hero || sampleImage(11, primary, "wide");
  const bannerUrls = banners.length > 0 ? banners : [sampleImage(23, primary, "wide")];

  // Real products first; top up with samples so the layout is judged on a full shop.
  const real = input.products.slice(0, 12);
  const missing = Math.max(0, TARGET_PRODUCTS - real.length);
  const catalog = CATALOG[flavor];
  // If the vendor already has categories, sample items stay uncategorised so
  // the category navigation only ever shows the vendor's own.
  const realHasCategory = real.some((p) => p.category?.trim());
  const sampleProducts = catalog.slice(0, missing).map((s, i) => {
    const img = sampleImage(i + 1, primary);
    return {
      id: `sample-${i}`,
      slug: `sample-${i}`,
      name: s.n,
      category: realHasCategory ? null : s.c,
      brand: s.b ?? null,
      description: "Sample product shown so you can judge the layout. Your own products will appear here.",
      price: s.p,
      compare_at_price: s.was ?? null,
      image_url: img,
      image_urls: [img, sampleImage(i + 41, primary)],
      rating_avg: s.r ? s.r[0] : null,
      rating_count: s.r ? s.r[1] : 0,
      stock_count: s.stock ?? 20,
    } satisfies PreviewProductInput;
  });
  const merged = [...real, ...sampleProducts].map(
    (p, i) =>
      ({
        store_id: "preview",
        is_available: true,
        created_at: new Date(Date.now() - i * 3600_000).toISOString(),
        condition: null,
        attributes: null,
        description: null,
        brand: null,
        slug: p.slug ?? p.id,
        ...p,
      }) as unknown as ProductRecord,
  );

  const categoryCounts: Record<string, number> = {};
  for (const p of merged) {
    const c = p.category?.trim();
    if (c) categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
  }

  const store = {
    id: "preview",
    vendor_id: "preview",
    name: storeName,
    slug: input.slug || "preview",
    logo_url: input.logoUrl.trim() || null,
    whatsapp_number: input.whatsapp || "2340000000000",
    currency: input.currency || "NGN",
    activated_currencies: input.activatedCurrencies,
    rating_avg: input.rating ? input.rating.avg : 4.8,
    rating_count: input.rating ? input.rating.count : 24,
    verification_tier: "none",
    is_verified: false,
    is_active: true,
  } as unknown as StoreRecord;

  const config = {
    hero_image_url: heroImage,
    banner_urls: bannerUrls,
    secondary_banner_url: bannerUrls[0] ?? "",
  } as unknown as StorefrontConfig;

  const props: TemplateProps = {
    store,
    products: merged,
    totalProducts: merged.length,
    nicheNames: input.nicheNames,
    completedOrdersCount: input.completedOrders ?? 58,
    config,
    copy: finalCopy,
    categories: Object.keys(categoryCounts),
    categoryCounts,
    selectedCategory: "",
    query: "",
    sort: "newest",
    isFiltered: false,
    follow: { isLoggedIn: false, isOwner: false, isFollowing: false },
    storeUrl: "https://sellee.store/v/preview",
    storeHomeHref: "/store-preview",
    bannerUrls,
    whatsappUrl: "#",
  };

  return {
    template: input.template,
    primary,
    props,
    sample: {
      logo: !input.logoUrl.trim(),
      hero: !hero,
      banner: banners.length === 0,
      products: sampleProducts.length,
      copy: copyIsSample,
      storeName: !input.name.trim(),
      ratings: !input.rating,
    },
  };
}
