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