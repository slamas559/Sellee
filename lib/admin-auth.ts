import { redirect } from "next/navigation";
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type AdminSession = Session & { user: Session["user"] & { role: "admin" } };

/**
 * Second layer of defense behind proxy.ts's hostname+role check. proxy.ts
 * keeps the console unreachable from outside and off the wrong host, but
 * every admin page and API route re-checks the session itself here too -
 * a request-time gate is one thing to get right; a page that only trusts
 * it is a second thing that has to also stay right forever.
 *
 * Use in a server component / layout - redirects to the admin login page
 * (or the marketplace, if somehow reached from a non-admin session) rather
 * than returning, since pages need a redirect, not a response object.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin-console/login");
  }

  return session as AdminSession;
}

/**
 * Same check for route handlers, where we want a 401/403 response instead
 * of a redirect. Returns the session on success, or a NextResponse to
 * return immediately on failure.
 */
export async function requireAdminApi(): Promise<AdminSession | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return session as AdminSession;
}
