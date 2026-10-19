"use client";

import Image from "next/image";
import Link from "next/link";
import { T } from "@/lib/storefront-theme";
import { ProductImage, Rating, usePrices, type CardProduct } from "./card-parts";
import { productHref } from "./utils";

export type MoreCardVariant = "brutal" | "beauty" | "gallery" | "noir" | "lookbook";

type Props = {
  product: CardProduct;
  store: { slug: string; currency?: string | null };
  variant: MoreCardVariant;
  index?: number;
  priority?: boolean;
  className?: string;
};

const pad = (n: number) => String(n + 1).padStart(2, "0");

/** Card styles for the Streetwear, Beauty, Home, Noir and Lookbook templates. */
export function MoreProductCard({ product, store, variant, index = 0, priority, className = "" }: Props) {
  const href = productHref(store.slug, product);
  const images = (product.image_urls ?? []).filter(Boolean);
  const img = images[0] ?? product.image_url;
  const { compare, pct, hasPromo, priceText } = usePrices(product, store.currency);
  const soldOut = typeof product.stock_count === "number" && product.stock_count <= 0;

  // ── Brutal: contact-sheet cell with hard borders (Streetwear) ──
  if (variant === "brutal") {
    return (
      <Link
        href={href}
        className={`group relative flex h-full flex-col border-b-2 border-r-2 border-[color:var(--s-ink)] bg-white transition-colors hover:bg-[var(--s-primary)] hover:text-[color:var(--s-primary-ink)] ${className}`}
      >
        <div className="relative aspect-square overflow-hidden border-b-2 border-[color:var(--s-ink)] bg-black/5">
          <ProductImage src={img} alt={product.name} sizes="(max-width:768px) 50vw, 25vw" priority={priority} className={`transition duration-300 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`} />
          <span className="absolute left-0 top-0 bg-[var(--s-ink)] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white">{pad(index)}</span>
          {hasPromo ? (
            <span className={`absolute bottom-0 right-0 px-2 py-0.5 text-xs font-bold ${T.primary}`}>-{pct}%</span>
          ) : null}
          {soldOut ? (
            <div className="absolute inset-0 grid place-items-center bg-white/60">
              <span className={`-rotate-12 border-2 border-[color:var(--s-ink)] bg-white px-2 py-0.5 text-lg uppercase text-[color:var(--s-ink)] ${T.display}`}>Sold out</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
          <h3 className="line-clamp-2 text-[12px] font-bold uppercase leading-tight tracking-wide">{product.name}</h3>
          <p className="flex items-baseline justify-between gap-2">
            <span className={`text-xl leading-none ${T.display}`}>{priceText}</span>
            {hasPromo ? <s className="text-[11px] opacity-60">{compare.formatted}</s> : null}
          </p>
        </div>
      </Link>
    );
  }

  // ── Beauty: rounded portrait, centred rating-led caption, pill button ──
  if (variant === "beauty") {
    return (
      <Link href={href} className={`group flex h-full flex-col ${className}`}>
        <div className={`relative aspect-[4/5] overflow-hidden ${T.rLg} ${T.primarySoft}`}>
          <ProductImage src={img} alt={product.name} sizes="(max-width:768px) 50vw, 25vw" priority={priority} className="transition duration-500 group-hover:scale-105" />
          {hasPromo ? (
            <span className={`absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold ${T.primaryText}`}>{pct}% off</span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col items-center px-1 pt-3 text-center">
          <Rating avg={product.rating_avg} count={product.rating_count} />
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
          <p className="mt-1 flex items-baseline gap-2 text-sm tabular-nums">
            <span className="font-bold">{priceText}</span>
            {hasPromo ? <s className={`text-xs ${T.muted}`}>{compare.formatted}</s> : null}
          </p>
          <span className={`mt-3 w-full rounded-full border py-2 text-xs font-bold transition ${T.primaryBorder} ${T.primaryText} group-hover:bg-[var(--s-primary)] group-hover:text-[color:var(--s-primary-ink)]`}>
            Order now
          </span>
        </div>
      </Link>
    );
  }

  // ── Gallery: wide landscape photo, name left / price right (Home) ──
  if (variant === "gallery") {
    return (
      <Link href={href} className={`group block ${className}`}>
        <div className={`relative aspect-[4/3] overflow-hidden ${T.rLg} bg-black/5`}>
          <ProductImage src={img} alt={product.name} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" priority={priority} className="transition duration-700 group-hover:scale-[1.04]" />
          {hasPromo ? (
            <span className="absolute left-3 top-3 bg-[var(--s-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">{pct}% off</span>
          ) : null}
        </div>
        <div className={`mt-3 flex items-baseline justify-between gap-4 border-b pb-3 ${T.line}`}>
          <h3 className={`line-clamp-1 text-xl ${T.display}`}>{product.name}</h3>
          <span className="shrink-0 text-sm tabular-nums">
            {priceText}
            {hasPromo ? <s className={`ml-2 text-xs ${T.muted}`}>{compare.formatted}</s> : null}
          </span>
        </div>
        <p className={`mt-1.5 line-clamp-1 text-xs ${T.muted}`}>
          {[product.category, product.brand].filter(Boolean).join(" · ") || "\u00A0"}
        </p>
      </Link>
    );
  }

  // ── Noir: framed square, spaced small caps, accent price ──
  if (variant === "noir") {
    return (
      <Link href={href} className={`group block border ${T.line} ${T.card} p-2.5 transition-colors hover:border-[color:var(--s-primary)] ${className}`}>
        <div className="relative aspect-square overflow-hidden bg-black">
          <ProductImage src={img} alt={product.name} sizes="(max-width:768px) 50vw, 33vw" priority={priority} className="opacity-95 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
        </div>
        <div className="px-1 pb-1 pt-3.5 text-center">
          <h3 className="line-clamp-1 text-[11px] uppercase tracking-[0.22em]">{product.name}</h3>
          <p className={`mt-2 text-sm tabular-nums ${T.primaryText}`}>
            {priceText}
            {hasPromo ? <s className={`ml-2 text-xs ${T.muted}`}>{compare.formatted}</s> : null}
          </p>
        </div>
      </Link>
    );
  }

  // ── Lookbook: full-bleed image, numbered caption on a gradient ──
  return (
    <Link href={href} className={`group relative block h-full w-full overflow-hidden bg-black/5 ${className}`}>
      {img ? (
        <Image src={img} alt={product.name} fill priority={priority} sizes="(max-width:768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center text-xs ${T.muted}`}>No image</div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-10 text-white sm:p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">No. {pad(index)}</p>
        <h3 className={`line-clamp-1 text-base uppercase tracking-tight sm:text-lg ${T.display}`}>{product.name}</h3>
        <p className="text-xs tabular-nums text-white/90">
          {priceText}
          {hasPromo ? <s className="ml-2 text-white/60">{compare.formatted}</s> : null}
        </p>
      </div>
      {soldOut ? (
        <span className="absolute right-3 top-3 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-black">Sold out</span>
      ) : null}
    </Link>
  );
}
