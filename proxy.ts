import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const DEFAULT_ROOT_DOMAIN = "sellee.store";

// Subdomains that must always be treated as the main app, never as a vendor
// store slug (in case a vendor ever picks one of these as a store slug too).
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "dashboard", "mail", "cdn"]);

// Flip this on (env var) once the wildcard DNS record + SSL certificate for
// "*.<root domain>" are live and verified working. Until then this proxy
// is a no-op for storefront subdomains and the app behaves exactly as it
// does today (the dashboard auth guard above is unaffected either way).
const SUBDOMAINS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_STORE_SUBDOMAINS === "true";

function rootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || DEFAULT_ROOT_DOMAIN;
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = new URL("/login", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // ── Vendor storefront subdomains ──
  if (!SUBDOMAINS_ENABLED) return NextResponse.next();

  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // strip the port for local testing
  const domain = rootDomain();

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isSubdomainRequest =
    hostname !== domain && hostname !== `www.${domain}` && hostname.endsWith(`.${domain}`);

  if (isSubdomainRequest) {
    const slug = hostname.slice(0, -(`.${domain}`.length));

    if (RESERVED_SUBDOMAINS.has(slug)) {
      return NextResponse.next();
    }

    // "olas-gadgets.sellee.store/watch-ultra-2" -> "/store/olas-gadgets/watch-ultra-2"
    const rewrittenPath = `/store/${slug}${pathname === "/" ? "" : pathname}`;
    const rewriteUrl = new URL(rewrittenPath + search, req.url);

    // The browser URL bar (and therefore usePathname() client-side) never
    // shows this rewritten path - it still shows "/" or "/product-slug".
    // Pass the real internal path along as a request header so Server
    // Components (see app/layout.tsx) can tell what's actually being
    // rendered, e.g. to hide the main site nav on vendor storefront pages.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-sellee-pathname", rewrittenPath);
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  }

  // On the main domain: send old-style "/store/:slug" links to their
  // subdomain form, so there's a single canonical URL once this is live.
  if (hostname === domain || hostname === `www.${domain}`) {
    const match = pathname.match(/^\/store\/([^/]+)(\/.*)?$/);
    if (match) {
      const [, slug, rest = ""] = match;
      if (!RESERVED_SUBDOMAINS.has(slug)) {
        const redirectUrl = new URL(`https://${slug}.${domain}${rest ?? ""}${search}`);
        return NextResponse.redirect(redirectUrl, 308);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};