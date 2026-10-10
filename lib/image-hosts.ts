/**
 * Hosts Sellee is willing to load images from through next/image.
 * Kept free of imports so next.config.ts can use it too.
 */

const STATIC_HOSTS = ["images.unsplash.com", "images.pexels.com"];

function getSupabaseUrl(): URL | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  } catch {
    return null;
  }
}

export function getAllowedImageHosts(): string[] {
  const supabase = getSupabaseUrl();
  return [supabase?.hostname ?? "*.supabase.co", ...STATIC_HOSTS];
}

export function getImageRemotePatterns() {
  const supabase = getSupabaseUrl();
  const patterns: Array<{ protocol: "http" | "https"; hostname: string; port?: string }> = [
    ...STATIC_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
  ];

  if (supabase) {
    patterns.push({
      protocol: supabase.protocol === "http:" ? "http" : "https",
      hostname: supabase.hostname,
      ...(supabase.port ? { port: supabase.port } : {}),
    });
  } else {
    patterns.push({ protocol: "https", hostname: "*.supabase.co" });
  }

  return patterns;
}

/** True when `value` is an https URL on one of the allowed image hosts. */
export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const supabase = getSupabaseUrl();
    const okProtocol =
      url.protocol === "https:" ||
      (supabase?.protocol === "http:" && url.hostname === supabase.hostname);
    if (!okProtocol) return false;

    return getAllowedImageHosts().some((host) =>
      host.startsWith("*.") ? url.hostname.endsWith(host.slice(1)) : url.hostname === host,
    );
  } catch {
    return false;
  }
}
