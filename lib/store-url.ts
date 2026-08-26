const DEFAULT_ROOT_DOMAIN = "sellee.store";
const DEFAULT_APP_URL = `https://${DEFAULT_ROOT_DOMAIN}`;

function publicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
}

export function mainAppUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${publicAppUrl().replace(/\/$/, "")}${normalizedPath}`;
}

export function buildLoginUrl(currentUrl: string): string {
  return `${mainAppUrl("/login")}?callbackUrl=${encodeURIComponent(currentUrl)}`;
}

/** Public, shareable URL for a vendor's storefront. */
export function storeUrl(slug: string): string {
  return `${publicAppUrl().replace(/\/$/, "")}/v/${slug}`;
}

/** Public, shareable URL for a single product on a vendor's storefront. */
export function storeProductUrl(slug: string, productRef: string): string {
  return `${publicAppUrl().replace(/\/$/, "")}/v/${slug}/${productRef}`;
}