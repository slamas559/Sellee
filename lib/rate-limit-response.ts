import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Counts a request and returns a ready-made 429 response when the caller is over the limit,
 * or `null` when the request may proceed.
 *
 *   const limited = await enforceRateLimit(`search:${getClientIp(request)}`, 60, 60_000);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  message = "Too many requests. Please slow down and try again shortly.",
): Promise<NextResponse | null> {
  const limit = await checkRateLimit(key, maxRequests, windowMs);
  if (limit.allowed) return null;

  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
  );
}
