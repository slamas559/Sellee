const DEFAULT_APP_URL = "https://sellee.store";

/**
 * Builds an absolute URL for the app, used for links inside emails and
 * anywhere else a full URL (not a relative path) is needed server-side.
 *
 * Deliberately NOT in app/actions/emails.ts - that file has "use server" at
 * the top, which turns every export into a Server Action, and Server
 * Actions must be async. This is a plain sync helper, so it lives in its
 * own file instead.
 */
export function appUrl(path = "/") {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    DEFAULT_APP_URL;

  return new URL(path, baseUrl).toString();
}

/**
 * Builds an absolute URL on the admin console's dedicated subdomain
 * (ADMIN_HOST, e.g. atlas.sellee.store) - NOT the main app domain. proxy.ts
 * 404s every /admin-console path on any other host, so a link built with
 * appUrl() here would be dead on arrival.
 */
export function adminConsoleUrl(path = "/") {
  const adminHost = process.env.ADMIN_HOST?.trim();
  if (!adminHost) {
    throw new Error("Missing required environment variable: ADMIN_HOST");
  }

  // Matches "localhost" itself AND any "*.localhost" subdomain (e.g. the
  // atlas.localhost used for local dev) - the previous startsWith() check
  // only matched a bare "localhost" host and missed this exact case.
  const isLocalHost = adminHost === "localhost" || adminHost.endsWith(".localhost");
  const protocol = isLocalHost ? "http" : "https";

  let hostWithPort = adminHost;
  if (isLocalHost) {
    // Local dev servers don't run on the default HTTP port (80), so
    // without an explicit port this silently resolves to a port nothing
    // is listening on. Reuse whatever port NEXTAUTH_URL already points
    // at (it's set for exactly this kind of local-URL-building), falling
    // back to Next's default dev port.
    const devPort = (() => {
      try {
        return new URL(process.env.NEXTAUTH_URL || "http://localhost:3000").port || "3000";
      } catch {
        return "3000";
      }
    })();
    hostWithPort = `${adminHost}:${devPort}`;
  }

  return new URL(path, `${protocol}://${hostWithPort}`).toString();
}