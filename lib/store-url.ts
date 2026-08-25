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

/**
 * Builds "<protocol>//<hostname><port>" using the protocol and port from
 * NEXT_PUBLIC_APP_URL. Hardcoding "https://" here would mean every
 * subdomain link built while running locally still points at the real
 * production site instead of localhost - deriving it from
 * NEXT_PUBLIC_APP_URL instead means setting that to
 * "http://localhost:3000" for local dev is enough to make every generated
 * link actually testable on your machine.
 */
function buildOrigin(hostname: string): string {
  try {
    const url = new URL(publicAppUrl());
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol}//${hostname}${port}`;
  } catch {
    return `https://${hostname}`;
  }
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

/**
 * Absolute URL for a path on the MAIN app - the real homepage, marketplace,
 * vendors directory, etc. - as opposed to a vendor's own subdomain.
 *
 * Needed for "exit" links (e.g. a product page's "Home"/"Marketplace"
 * breadcrumb) when the current page is being viewed on a vendor's
 * subdomain: a plain relative "/" would resolve to THIS VENDOR'S OWN store
 * home instead of the real site homepage, because proxy.ts's rewrite
 * resolves a bare path against whatever subdomain the browser is currently
 * on - it has no way to know the link was meant to mean "leave this store
 * entirely."
 */
export function mainAppUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${publicAppUrl().replace(/\/$/, "")}${normalizedPath}`;
}

/**
 * Builds a correct "/login?callbackUrl=..." URL, safe to call from a page
 * being viewed on a vendor's subdomain.
 *
 * Two things go wrong without this: (1) "/login" is an app-wide route, so a
 * plain relative "/login" link on a subdomain gets rewritten by proxy.ts
 * against that subdomain and 404s, the same issue already fixed for the
 * header's logo/Map/search links (see mainAppUrl above); (2) currentUrl
 * needs to be the full absolute URL of wherever the user currently is
 * (typically window.location.href, read inside a click handler - never
 * during render, since window isn't available server-side and using it
 * there would cause a hydration mismatch) so that after logging in on the
 * real apex /login page, NextAuth can send them all the way back to the
 * subdomain page they started on - not just a same-origin relative path.
 * NextAuth also needs an explicit allowlist for that cross-origin redirect
 * to be honored; see the `redirect` callback in lib/auth.ts.
 */
export function buildLoginUrl(currentUrl: string): string {
  return `${mainAppUrl("/login")}?callbackUrl=${encodeURIComponent(currentUrl)}`;
}

/** Public, shareable URL for a vendor's storefront. */
export function storeUrl(slug: string): string {
  if (storeSubdomainsEnabled()) {
    return buildOrigin(`${slug}.${rootDomain()}`);
  }
  return `${publicAppUrl().replace(/\/$/, "")}/store/${slug}`;
}

/** Public, shareable URL for a single product on a vendor's storefront. */
export function storeProductUrl(slug: string, productRef: string): string {
  if (storeSubdomainsEnabled()) {
    return `${buildOrigin(`${slug}.${rootDomain()}`)}/${productRef}`;
  }
  return `${publicAppUrl().replace(/\/$/, "")}/store/${slug}/${productRef}`;
}