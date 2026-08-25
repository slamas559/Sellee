export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatNaira(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formats a duration given in milliseconds as a short human string, e.g. "2h 15m" or "3d 4h". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "—";
  }

  const minutes = Math.round(ms / 60000);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours < 24) {
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatProductPathSegment(product: {
  id: string;
  slug?: string | null;
  name?: string | null;
}): string {
  const baseSlug = (product.slug ?? "").trim() || slugify(product.name ?? "") || "product";
  return `${baseSlug}-${product.id}`;
}

export function parseProductPathSegment(segment: string): {
  id: string | null;
  slugPart: string | null;
  isUuidOnly: boolean;
} {
  const trimmed = decodeURIComponent(segment).trim();
  if (UUID_LIKE.test(trimmed)) {
    return { id: trimmed, slugPart: null, isUuidOnly: true };
  }

  // Parse "<slug>-<uuid>" by extracting a UUID that appears at the end.
  const trailingUuid = trimmed.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  if (trailingUuid) {
    const id = trailingUuid[1].toLowerCase();
    const prefix = trimmed.slice(0, trailingUuid.index ?? 0);
    const slugPart = prefix.replace(/-+$/g, "").trim() || null;
    return { id, slugPart, isUuidOnly: false };
  }

  return { id: null, slugPart: trimmed || null, isUuidOnly: false };
}