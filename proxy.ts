import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_CONSOLE_PREFIX = "/admin-console";
const ADMIN_API_PREFIX = "/api/admin-console";

// Paths under the admin console that must stay reachable WITHOUT an
// existing admin session — they're how someone becomes an admin in the
// first place (or the login page itself). Everything else under the
// console requires a valid role="admin" session, checked below.
function isPublicAdminPath(pathname: string): boolean {
  if (pathname === `${ADMIN_CONSOLE_PREFIX}/login`) return true;
  if (pathname.startsWith(`${ADMIN_CONSOLE_PREFIX}/accept-invite/`)) return true;
  if (pathname === `${ADMIN_API_PREFIX}/admins/accept`) return true;
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host")?.split(":")[0] ?? "";
  const adminHost = process.env.ADMIN_HOST?.trim();
  const isAdminHost = Boolean(adminHost) && hostname === adminHost;
  const isAdminPath =
    pathname === ADMIN_CONSOLE_PREFIX ||
    pathname.startsWith(`${ADMIN_CONSOLE_PREFIX}/`) ||
    pathname.startsWith(`${ADMIN_API_PREFIX}/`);
  // NextAuth's own routes (csrf token, credentials callback, session,
  // error page, etc.) live under /api/auth/* regardless of which host
  // they're hit from - the admin login form needs these to work exactly
  // like the vendor/customer one does, so they must stay reachable on the
  // admin host too, unauthenticated, or the sign-in handshake itself
  // breaks before a session ever exists to check.
  const isNextAuthPath = pathname.startsWith("/api/auth/");

  // The admin console is only ever reachable on its own dedicated
  // subdomain. Guessing the path on the main domain (or any other host)
  // always 404s here, before any page or route handler even runs —
  // independent of whether the request also happens to carry a valid
  // session.
  if (isAdminPath && !isAdminHost) {
    return new NextResponse(null, { status: 404 });
  }

  if (isAdminHost) {
    // This host has exactly two jobs: serve the console, and let NextAuth
    // do its thing. Anything else visited on it 404s, except a bare "/"
    // which is sent into the console rather than showing the marketplace.
    if (!isAdminPath && !isNextAuthPath) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL(ADMIN_CONSOLE_PREFIX, req.url));
      }
      return new NextResponse(null, { status: 404 });
    }

    if (isAdminPath && !isPublicAdminPath(pathname)) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token || token.role !== "admin" || token.isDeleted) {
        return NextResponse.redirect(new URL(`${ADMIN_CONSOLE_PREFIX}/login`, req.url));
      }
    }

    return NextResponse.next();
  }

  // ── Vendor dashboard auth guard (unrelated to the admin host) ──
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = new URL("/login", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
