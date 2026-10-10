/** Best-effort client IP from proxy headers. Returns "unknown" when none is present. */
export function getIpFromHeaders(
  forwardedFor: string | string[] | null | undefined,
  realIp?: string | string[] | null,
): string {
  const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const real = Array.isArray(realIp) ? realIp[0] : realIp;
  const first = forwarded?.split(",")[0]?.trim();
  return first || real?.trim() || "unknown";
}

export function getClientIp(request: Request): string {
  return getIpFromHeaders(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );
}
