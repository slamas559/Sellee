import { headers } from "next/headers";

/**
 * Returns the vendor store slug the current request is being served under
 * via the subdomain rewrite in proxy.ts (e.g. "olas-gadgets" for a request
 * to olas-gadgets.sellee.store), or null if this request came in through
 * the ordinary apex/path-based route ("sellee.store/store/olas-gadgets").
 *
 * Needed anywhere a page builds a link to a product or page within the
 * SAME store: on the apex domain, that link needs the "/store/:slug"
 * prefix (it's an absolute path from the root). On a subdomain, the prefix
 * must NOT be added - proxy.ts already resolves a bare path against the
 * current subdomain, so adding "/store/:slug" again produces
 * "/store/:slug/store/:slug/..." and 404s. (See the "x-sellee-pathname"
 * header proxy.ts sets on every subdomain-rewritten request - the same
 * signal app/layout.tsx uses to hide the main site nav on storefront
 * pages.)
 */
export async function getCurrentSubdomainSlug(): Promise<string | null> {
  const headersList = await headers();
  const rewrittenPath = headersList.get("x-sellee-pathname");
  if (!rewrittenPath) return null;

  const match = rewrittenPath.match(/^\/store\/([^/]+)/);
  return match ? match[1] : null;
}