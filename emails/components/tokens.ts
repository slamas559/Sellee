/**
 * Design tokens for every Sellee email.
 *
 * Colours come straight from the logo (green #16A34A, navy #0B1629) so emails
 * look like the product. Everything is plain inline-style values on purpose:
 * email clients ignore most modern CSS, and inline styles are the only thing
 * that renders the same in Gmail, Outlook and Apple Mail.
 */

export const color = {
  ink: "#0B1629", // headings, primary button (the logo's navy)
  body: "#3B4656", // paragraph text
  muted: "#5F6A7A", // secondary text, labels (4.6:1+ on both card and canvas)
  line: "#E6E9EE", // hairlines and borders
  canvas: "#F4F6F8", // page background behind the card
  card: "#FFFFFF",
  brand: "#16A34A", // logo green: accents and marks only
  brandDark: "#15803D", // links and text on white (passes AA contrast)
  brandSoft: "#EAF6EF",
  warnInk: "#8A4B08",
  warnLine: "#E8A317",
  dangerInk: "#9F1D12",
  dangerLine: "#DC4437",
} as const;

export const font = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
} as const;

/** Card width in px. One width everywhere so every email feels like the same product. */
export const EMAIL_WIDTH = 560;

/**
 * Full-colour logo (green bag + navy wordmark), trimmed of transparent padding
 * so it lines up with the text edge, and exported at 3x for sharp phone screens.
 * Source file: public/brand/sellee-email-logo.png. Designed for light backgrounds.
 */
export const LOGO_URL = "https://sellee.store/brand/sellee-email-logo.png";
export const LOGO_WIDTH = 108;
export const LOGO_HEIGHT = 36;

export const SITE_URL = "https://sellee.store";
export const SUPPORT_EMAIL = "support@sellee.store";

export function firstNameOf(name?: string | null, fallback = "there") {
  return name?.trim()?.split(/\s+/)[0] || fallback;
}
