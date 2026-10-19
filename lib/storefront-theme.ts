import type { CSSProperties } from "react";

/**
 * Storefront design tokens.
 *
 * Every public store page is wrapped in <ThemeScope>, which sets the CSS
 * variables built here. Components read them (bg-[var(--s-primary)], etc.), so a
 * vendor's colour and the template's personality (radius, fonts, background)
 * flow through the whole storefront without hardcoded emerald/slate classes.
 */

export type TemplateKey =
  | "grocery_promo"
  | "fashion_editorial"
  | "lifestyle_showcase"
  | "modern_grid"
  | "street_drop"
  | "soft_beauty"
  | "home_living"
  | "noir_gallery"
  | "lookbook";

/**
 * "platform" is Sellee's own neutral look. Product pages use it whenever a
 * customer arrives from the marketplace, home, search or vendors lists, so
 * product pages look the same no matter which vendor's product it is. A
 * vendor's template only applies when the visit comes from their own store.
 */
export type ThemeKey = TemplateKey | "platform" | "noir_light";
export const PLATFORM_PRIMARY = "#047857";

export const TEMPLATE_KEYS: TemplateKey[] = [
  "grocery_promo",
  "fashion_editorial",
  "lifestyle_showcase",
  "modern_grid",
  "street_drop",
  "soft_beauty",
  "home_living",
  "noir_gallery",
  "lookbook",
];

/**
 * The dark Noir storefront would put dark text on dark backgrounds on the
 * (light-card) product page, so that page uses a light variant that keeps the
 * template's fonts and the vendor's colour.
 */
export function productScopeKey(template: TemplateKey): ThemeKey {
  return template === "noir_gallery" ? "noir_light" : template;
}

/** Maps any stored value (including legacy classic/bold/minimal) to a real template. */
export function resolveTemplate(value: string | null | undefined): TemplateKey {
  const v = (value ?? "").trim();
  if ((TEMPLATE_KEYS as string[]).includes(v)) return v as TemplateKey;
  if (v === "bold") return "modern_grid";
  if (v === "minimal") return "fashion_editorial";
  return "grocery_promo";
}

type Tokens = {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  soft?: string;
  radius: string;
  radiusLg: string;
  fontDisplay: string;
  fontBody: string;
};

const TOKENS: Record<ThemeKey, (primary: string) => Tokens> = {
  street_drop: () => ({
    bg: "#efeee8",
    card: "#ffffff",
    ink: "#0a0a0a",
    muted: "#52525b",
    line: "#0a0a0a",
    radius: "0px",
    radiusLg: "0px",
    fontDisplay: "var(--font-anton)",
    fontBody: "var(--font-archivo)",
  }),
  soft_beauty: () => ({
    bg: "#fdf8f6",
    card: "#ffffff",
    ink: "#3b2f2f",
    muted: "#8a7a78",
    line: "#f0e1dc",
    radius: "16px",
    radiusLg: "28px",
    fontDisplay: "var(--font-bodoni)",
    fontBody: "var(--font-dm-sans)",
  }),
  home_living: () => ({
    bg: "#f4efe8",
    card: "#fbf8f3",
    ink: "#2b2622",
    muted: "#7a6f64",
    line: "#e2d9cc",
    radius: "4px",
    radiusLg: "10px",
    fontDisplay: "var(--font-instrument)",
    fontBody: "var(--font-manrope)",
  }),
  noir_gallery: (primary) => ({
    bg: "#0f0e0d",
    card: "#171513",
    ink: "#f3eee6",
    muted: "#a0978a",
    line: "#2d2926",
    soft: `color-mix(in srgb, ${primary} 18%, #0f0e0d)`,
    radius: "2px",
    radiusLg: "4px",
    fontDisplay: "var(--font-cormorant)",
    fontBody: "var(--font-dm-sans)",
  }),
  noir_light: () => ({
    bg: "#f8f7f5",
    card: "#ffffff",
    ink: "#1c1917",
    muted: "#78716c",
    line: "#e7e5e4",
    radius: "4px",
    radiusLg: "6px",
    fontDisplay: "var(--font-cormorant)",
    fontBody: "var(--font-dm-sans)",
  }),
  lookbook: () => ({
    bg: "#f6f6f3",
    card: "#ffffff",
    ink: "#111111",
    muted: "#6b6b66",
    line: "#d9d9d3",
    radius: "0px",
    radiusLg: "0px",
    fontDisplay: "var(--font-space-grotesk)",
    fontBody: "var(--font-dm-sans)",
  }),
  platform: () => ({
    bg: "#f8f7f5",
    card: "#ffffff",
    ink: "#1c1917",
    muted: "#78716c",
    line: "#e7e5e4",
    radius: "12px",
    radiusLg: "16px",
    fontDisplay: "var(--font-geist-sans)",
    fontBody: "var(--font-geist-sans)",
  }),
  grocery_promo: () => ({
    bg: "#f5f6f3",
    card: "#ffffff",
    ink: "#111827",
    muted: "#6b7280",
    line: "#e5e7eb",
    radius: "10px",
    radiusLg: "16px",
    fontDisplay: "var(--font-manrope)",
    fontBody: "var(--font-manrope)",
  }),
  fashion_editorial: () => ({
    bg: "#faf8f5",
    card: "#faf8f5",
    ink: "#1c1917",
    muted: "#78716c",
    line: "#e7e2da",
    radius: "0px",
    radiusLg: "0px",
    fontDisplay: "var(--font-fraunces)",
    fontBody: "var(--font-dm-sans)",
  }),
  lifestyle_showcase: (primary) => ({
    bg: `color-mix(in srgb, ${primary} 7%, #fffdf9)`,
    card: "#ffffff",
    ink: "#1e293b",
    muted: "#64748b",
    line: `color-mix(in srgb, ${primary} 14%, #e5e7eb)`,
    radius: "20px",
    radiusLg: "32px",
    fontDisplay: "var(--font-bricolage)",
    fontBody: "var(--font-dm-sans)",
  }),
  modern_grid: () => ({
    bg: "#eef0f3",
    card: "#ffffff",
    ink: "#0f172a",
    muted: "#64748b",
    line: "#dfe3e8",
    radius: "6px",
    radiusLg: "10px",
    fontDisplay: "var(--font-archivo)",
    fontBody: "var(--font-archivo)",
  }),
};

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Text colour that stays readable on top of the vendor's primary colour. */
export function readableOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#111827" : "#ffffff";
}

export function safePrimary(value: string | null | undefined, fallback = "#059669") {
  return value && parseHex(value) ? value : fallback;
}

export function themeStyle(template: ThemeKey, primaryInput: string): CSSProperties {
  const primary = safePrimary(primaryInput);
  const t = TOKENS[template](primary);
  const vars: Record<string, string> = {
    "--s-primary": primary,
    "--s-primary-ink": readableOn(primary),
    "--s-primary-soft": t.soft ?? `color-mix(in srgb, ${primary} 10%, white)`,
    "--s-bg": t.bg,
    "--s-card": t.card,
    "--s-ink": t.ink,
    "--s-muted": t.muted,
    "--s-line": t.line,
    "--s-r": t.radius,
    "--s-r-lg": t.radiusLg,
    "--s-font-display": t.fontDisplay,
    "--s-font-body": t.fontBody,
    fontFamily: "var(--s-font-body), system-ui, sans-serif",
  };
  return vars as CSSProperties;
}

/**
 * Class names for the tokens. They are written out in full here so Tailwind
 * can see them. Use these instead of hardcoding emerald-/slate- in storefronts.
 */
export const T = {
  bg: "bg-[var(--s-bg)]",
  card: "bg-[var(--s-card)]",
  ink: "text-[color:var(--s-ink)]",
  muted: "text-[color:var(--s-muted)]",
  line: "border-[color:var(--s-line)]",
  primary: "bg-[var(--s-primary)] text-[color:var(--s-primary-ink)]",
  primarySoft: "bg-[var(--s-primary-soft)]",
  primaryText: "text-[color:var(--s-primary)]",
  primaryBorder: "border-[color:var(--s-primary)]",
  r: "rounded-[var(--s-r)]",
  rLg: "rounded-[var(--s-r-lg)]",
  display: "font-[family-name:var(--s-font-display)]",
} as const;

// ─── Copy helpers ───────────────────────────────────────────────────────────
// Older stores had these generic defaults saved into storefront_config. They
// read as filler, so templates treat them as "not set" and fall back to the
// store's own name / categories instead.
const GENERIC_COPY = new Set([
  "discover trusted products near you",
  "shop from local vendors with fast whatsapp ordering and live availability.",
  "fresh picks this week",
  "shop now",
]);

export function cleanCopy(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return GENERIC_COPY.has(text.toLowerCase()) ? "" : text;
}

export function whatsappHref(number: string | null | undefined, text?: string) {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function discountPercent(price: number, compareAt: number | null | undefined) {
  const compare = Number(compareAt ?? 0);
  if (!compare || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}
