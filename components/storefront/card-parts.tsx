"use client";

import Image from "next/image";
import { useConvertedPrice } from "@/components/marketplace/currency-switcher";
import { discountPercent, T } from "@/lib/storefront-theme";

export type CardProduct = {
  id: string;
  slug?: string;
  name: string;
  category: string | null;
  brand?: string | null;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  rating_avg: number | null;
  rating_count: number;
  stock_count?: number;
};

export function usePrices(product: CardProduct, currency: string | null | undefined) {
  const price = useConvertedPrice(Number(product.price), currency ?? "NGN");
  const compare = useConvertedPrice(Number(product.compare_at_price ?? 0), currency ?? "NGN");
  const pct = discountPercent(Number(product.price), product.compare_at_price);
  return { price, compare, pct, hasPromo: pct !== null, priceText: `${price.formatted}${price.isEstimate ? " est." : ""}` };
}

/** Price (with strike-through compare price) for server-rendered templates. */
export function Price({
  product,
  currency,
  className = "",
  compareClassName = "",
}: {
  product: CardProduct;
  currency: string | null | undefined;
  className?: string;
  compareClassName?: string;
}) {
  const { compare, hasPromo, priceText } = usePrices(product, currency);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`tabular-nums ${className}`}>{priceText}</span>
      {hasPromo ? <s className={`text-[0.8em] tabular-nums opacity-60 ${compareClassName}`}>{compare.formatted}</s> : null}
    </span>
  );
}

export function ProductImage({
  src,
  alt,
  sizes,
  className = "",
  priority,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/[0.04] text-xs text-[color:var(--s-muted)]">
        No image
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}

export function Rating({ avg, count, className = "" }: { avg: number | null; count: number; className?: string }) {
  if (!avg || count < 1) return null;
  return (
    <span className={`text-[11px] ${T.muted} ${className}`}>
      <span aria-hidden="true" className="text-amber-500">★</span> {avg.toFixed(1)} ({count})
    </span>
  );
}
