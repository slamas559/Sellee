import { formatProductPathSegment } from "@/lib/format";
import { storeProductUrl } from "@/lib/store-url";
import type { ProductRecord } from "@/types";

export type CategoryCover = { category: string; count: number; image: string | null };

/** First product photo per category, biggest categories first. */
export function categoryCovers(
  products: ProductRecord[],
  counts: Record<string, number>,
  max = 5,
): CategoryCover[] {
  const covers = new Map<string, string | null>();
  for (const p of products) {
    const c = p.category?.trim();
    if (!c) continue;
    const img = (p.image_urls ?? []).find(Boolean) ?? p.image_url ?? null;
    if (!covers.has(c) || (!covers.get(c) && img)) covers.set(c, img);
  }
  return [...covers.entries()]
    .map(([category, image]) => ({ category, image, count: counts[category] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Link to a product from inside a vendor's own store. Lives here (not in
 * card-parts.tsx) because server components call it, and a "use client"
 * module's functions cannot be called from the server.
 */
export function productHref(
  storeSlug: string,
  product: { id: string; slug?: string | null; name?: string | null },
) {
  return `${storeProductUrl(storeSlug, formatProductPathSegment(product))}?from=store`;
}
