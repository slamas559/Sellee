import { appUrl } from "@/lib/app-url";

const DEFAULT_ROOT_DOMAIN = "sellee.store";

/**
 * The bare root domain the app is served from (no protocol, no "www.").
 * Falls back to parsing it out of NEXT_PUBLIC_APP_URL / NEXTAUTH_URL so
 * there's only one place (the app URL) that needs to stay correct per
 * environment.
 */
function rootDomain(): string {
  const envDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (envDomain) return envDomain;

  try {
    return new URL(appUrl()).hostname.replace(/^www\./, "");
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
  return appUrl(`/store/${slug}`);
}

/** Public, shareable URL for a single product on a vendor's storefront. */
export function storeProductUrl(slug: string, productRef: string): string {
  if (storeSubdomainsEnabled()) {
    return `https://${slug}.${rootDomain()}/${productRef}`;
  }
  return appUrl(`/store/${slug}/${productRef}`);
}