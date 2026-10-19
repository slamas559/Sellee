"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { T } from "@/lib/storefront-theme";
import { ProductImage, Rating, usePrices, type CardProduct } from "./card-parts";
import { productHref } from "./utils";
import { MoreProductCard, type MoreCardVariant } from "./product-cards-more";

export type CardVariant = "market" | "plain" | "soft" | "dense" | MoreCardVariant;

type StoreProductCardProps = {
  product: CardProduct;
  store: { slug: string; currency?: string | null };
  variant: CardVariant;
  /** soft variant only: image aspect, e.g. "4/5". */
  aspect?: string;
  /** Position in the list (used by the numbered card styles). */
  index?: number;
  /** Marks the first above-the-fold images as high priority. */
  priority?: boolean;
  className?: string;
};

export function StoreProductCard(props: StoreProductCardProps) {
  const { variant } = props;
  if (variant === "brutal" || variant === "beauty" || variant === "gallery" || variant === "noir" || variant === "lookbook") {
    return <MoreProductCard product={props.product} store={props.store} variant={variant} index={props.index} priority={props.priority} className={props.className} />;
  }
  return <BaseProductCard {...props} variant={variant} />;
}

function BaseProductCard({
  product,
  store,
  variant,
  aspect = "4/5",
  priority,
  className = "",
}: StoreProductCardProps & { variant: "market" | "plain" | "soft" | "dense" }) {
  const href = productHref(store.slug, product);
  const images = (product.image_urls ?? []).filter(Boolean);
  const primaryImage = images[0] ?? product.image_url;
  const secondImage = images[1] ?? null;
  const { price, compare, pct, hasPromo } = usePrices(product, store.currency);
  const priceText = `${price.formatted}${price.isEstimate ? " est." : ""}`;

  // ── Market: price-first, promo-forward (marketplace feel) ──
  if (variant === "market") {
    return (
      <Link
        href={href}
        className={`group flex h-full flex-col overflow-hidden border ${T.line} ${T.card} ${T.r} transition hover:shadow-md ${className}`}
      >
        <div className="relative aspect-square overflow-hidden bg-black/[0.04]">
          <ProductImage src={primaryImage} alt={product.name} sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 20vw" priority={priority} className="transition duration-300 group-hover:scale-[1.04]" />
          {hasPromo ? (
            <span className={`absolute left-0 top-2 rounded-r-md px-2 py-0.5 text-[11px] font-extrabold ${T.primary}`}>
              -{pct}%
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-extrabold tabular-nums sm:text-base">{priceText}</span>
            {hasPromo ? <s className={`text-xs tabular-nums ${T.muted}`}>{compare.formatted}</s> : null}
          </div>
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug">{product.name}</h3>
          <Rating avg={product.rating_avg} count={product.rating_count} />
          <span className={`mt-auto inline-flex h-8 items-center justify-center pt-0 text-xs font-bold ${T.r} ${T.primarySoft} ${T.primaryText} transition group-hover:bg-[var(--s-primary)] group-hover:text-[color:var(--s-primary-ink)]`}>
            View &amp; order
          </span>
        </div>
      </Link>
    );
  }

  // ── Plain: borderless editorial caption under a tall image ──
  if (variant === "plain") {
    return (
      <Link href={href} className={`group block ${className}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-black/[0.05]">
          <ProductImage src={primaryImage} alt={product.name} sizes="(max-width:768px) 50vw, 25vw" priority={priority} className={secondImage ? "transition-opacity duration-500 group-hover:opacity-0" : "transition duration-700 group-hover:scale-[1.03]"} />
          {secondImage ? (
            <Image src={secondImage} alt="" fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          ) : null}
          {hasPromo ? (
            <span className="absolute left-0 top-3 bg-[var(--s-ink)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              Sale
            </span>
          ) : null}
        </div>
        <div className="pt-3">
          <h3 className="line-clamp-1 text-[13px] font-medium tracking-wide">{product.name}</h3>
          <p className={`mt-1 flex items-baseline gap-2 text-[13px] tabular-nums ${T.muted}`}>
            <span className={hasPromo ? "text-[color:var(--s-ink)]" : ""}>{priceText}</span>
            {hasPromo ? <s className="text-xs">{compare.formatted}</s> : null}
          </p>
        </div>
      </Link>
    );
  }

  // ── Soft: rounded lifestyle card, price chip on the photo ──
  if (variant === "soft") {
    return (
      <Link
        href={href}
        className={`group block overflow-hidden ${T.card} ${T.rLg} shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.4)] ${className}`}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: aspect }}>
          <ProductImage src={primaryImage} alt={product.name} sizes="(max-width:640px) 70vw, (max-width:1024px) 40vw, 25vw" priority={priority} className="transition duration-500 group-hover:scale-105" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold tabular-nums text-slate-900 shadow-sm backdrop-blur">
            {priceText}
          </span>
          <span className={`absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full ${T.primary} transition group-hover:scale-110`}>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
          {hasPromo ? (
            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${T.primary}`}>{pct}% off</span>
          ) : null}
        </div>
        <div className="space-y-1 px-4 pb-4 pt-3">
          <h3 className={`line-clamp-2 text-[15px] font-semibold leading-snug ${T.display}`}>{product.name}</h3>
          <div className="flex items-center justify-between gap-2">
            <span className={`line-clamp-1 text-xs ${T.muted}`}>{product.category || "\u00A0"}</span>
            {hasPromo ? <s className={`text-xs tabular-nums ${T.muted}`}>{compare.formatted}</s> : null}
          </div>
        </div>
      </Link>
    );
  }

  // ── Dense: spec-sheet style for catalog shopping ──
  const stock = product.stock_count;
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col overflow-hidden border ${T.line} ${T.card} ${T.r} transition hover:border-[color:var(--s-primary)] ${className}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/[0.04]">
        <ProductImage src={primaryImage} alt={product.name} sizes="(max-width:640px) 50vw, (max-width:1280px) 33vw, 25vw" priority={priority} className="transition duration-300 group-hover:scale-[1.03]" />
        {hasPromo ? (
          <span className="absolute right-1.5 top-1.5 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{pct}%</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className={`line-clamp-1 text-[10px] font-semibold uppercase tracking-wider ${T.muted}`}>
          {product.brand || product.category || "\u00A0"}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight">{product.name}</h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="text-sm font-bold tabular-nums">{priceText}</span>
          {hasPromo ? <s className={`text-[11px] tabular-nums ${T.muted}`}>{compare.formatted}</s> : null}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-[color:var(--s-line)] pt-1.5">
          <Rating avg={product.rating_avg} count={product.rating_count} />
          {typeof stock === "number" ? (
            stock <= 0 ? (
              <span className="text-[11px] font-semibold text-rose-600">Sold out</span>
            ) : stock <= 5 ? (
              <span className="text-[11px] font-semibold text-amber-600">Only {stock} left</span>
            ) : (
              <span className="text-[11px] font-medium text-emerald-700">In stock</span>
            )
          ) : null}
        </div>
      </div>
    </Link>
  );
}
