const DEFAULT_ROOT_DOMAIN = "sellee.store";
const DEFAULT_APP_URL = `https://${DEFAULT_ROOT_DOMAIN}`;

/**
 * Public, client-safe app URL. Deliberately does NOT fall back to
 * NEXTAUTH_URL the way lib/app-url.ts's `appUrl()` does - NEXTAUTH_URL isn't
 * prefixed with NEXT_PUBLIC_, so Next.js strips it out of the client bundle.
 * A function used from Client Components (like the ones that call storeUrl
 * below) runs once during SSR and again during client hydration; if it reads
 * a var that's only visible on the server, the two passes disagree and React
 * throws a hydration mismatch. Every value read here must be identical in
 * both environments - either a NEXT_PUBLIC_ var, or this hardcoded default.
 */
function publicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
}

/** The bare root domain the app is served from (no protocol, no "www."). */
function rootDomain(): string {
  const envDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (envDomain) return envDomain;

  try {
    return new URL(publicAppUrl()).hostname.replace(/^www\./, "");
  } catch {
    return DEFAULT_ROOT_DOMAIN;
  }
}

/**
 * Flip NEXT_PUBLIC_ENABLE_STORE_SUBDOMAINS=true once the wildcard DNS
 * record + SSL certificate for "*.<root domain>" are live. Until then, every
 * link this helper builds keeps using the existing "/store/:slug" path form,
 * so nothing breaks mid-rollout.
 */
export function storeSubdomainsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STORE_SUBDOMAINS === "true";
}

/** Public, shareable URL for a vendor's storefront. */
export function storeUrl(slug: string): string {
  if (storeSubdomainsEnabled()) {
    return `https://${slug}.${rootDomain()}`;
  }
  return `${publicAppUrl().replace(/\/$/, "")}/store/${slug}`;
}

/** Public, shareable URL for a single product on a vendor's storefront. */
export function storeProductUrl(slug: string, productRef: string): string {
  if (storeSubdomainsEnabled()) {
    return `https://${slug}.${rootDomain()}/${productRef}`;
  }
  return `${publicAppUrl().replace(/\/$/, "")}/store/${slug}/${productRef}`;
}