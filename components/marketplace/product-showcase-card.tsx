"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { StarRating } from "@/components/store/star-rating";
import { formatNaira, formatProductPathSegment } from "@/lib/format";
import { storeUrl, storeProductUrl, storeSubdomainsEnabled } from "@/lib/store-url";
import type { StoreTemplate } from "@/types";
import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";

type ProductShowcaseCardProps = {
  product: {
    id: string;
    slug?: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number;
    image_url: string | null;
    image_urls: string[] | null;
    rating_avg: number | null;
    rating_count: number;
  };
  store: {
    name: string;
    slug: string;
    logo_url: string | null;
    rating_avg?: number | null;
    rating_count?: number;
    is_verified?: boolean | null;
  };
  variant?: "home" | "marketplace" | "store";
  template?: StoreTemplate;
  source?: "home" | "marketplace" | "store" | "vendors";
  /**
   * The vendor slug the current page is being served under via subdomain
   * (e.g. "olas-gadgets" when viewing olas-gadgets.sellee.store), or
   * undefined/null on the ordinary apex/path-based route. See
   * lib/current-subdomain.ts for why this changes which link form is
   * correct.
   */
  currentSubdomainSlug?: string | null;
};

export function ProductShowcaseCard({
  product,
  store,
  variant = "marketplace",
  template = "classic",
  source,
  currentSubdomainSlug,
}: ProductShowcaseCardProps) {
  const router = useRouter();
  const didPrefetchRef = useRef(false);
  const navigationSource = source ?? (variant === "home" ? "home" : variant);
  const productPathRef = formatProductPathSegment(product);
  const productHref =
    currentSubdomainSlug && currentSubdomainSlug === store.slug
      ? // Already on this exact store's subdomain: a short relative path,
        // no "/store/:slug" prefix - proxy.ts resolves it against the
        // current subdomain automatically. Adding the prefix here too would
        // double it up into "/store/:slug/store/:slug/..." and 404.
        `/${productPathRef}?from=${navigationSource}`
      : storeSubdomainsEnabled()
        ? // Subdomains are live and this product belongs to some OTHER
          // store than the one currently being viewed (including "no
          // store at all" - e.g. clicking from the homepage or
          // marketplace). A relative "/store/:slug/..." link would just
          // get redirected to this exact URL by proxy.ts anyway, but that
          // redirect happens mid cross-origin RSC fetch, which Next's
          // client router can't follow - it always logs "Failed to fetch
          // RSC payload" and falls back to a full reload. Building the
          // real URL up front skips that failed round trip entirely.
          `${storeProductUrl(store.slug, productPathRef)}?from=${navigationSource}`
        : // Subdomains disabled entirely: old relative path form.
          `/store/${store.slug}/${productPathRef}?from=${navigationSource}`;
  const images = useMemo(() => {
    const normalized = (product.image_urls ?? []).filter(Boolean);
    if (normalized.length > 0) return normalized;
    return product.image_url ? [product.image_url] : [];
  }, [product.image_url, product.image_urls]);

  const [index, setIndex] = useState(0);
  const hasManyImages = images.length > 1;
  const activeImage = images[index] ?? null;
  const isCompact = variant === "home" || variant === "marketplace";
  const headlineClass = isCompact ? "text-[13px]" : "text-base text-[13px] sm:text-[14px] lg:text-[13px]";
  const imageHeightClass = isCompact ? "h-50 sm:h-62" : "h-46 sm:h-62";
  const contentWrapClass = isCompact
    ? "space-y-1.5 px-1.5 pb-1 pt-1.5 sm:space-y-2 sm:px-2.5 sm:pt-3"
    : "space-y-2 px-1.5 pb-1 pt-2 sm:px-2.5 sm:pt-3";
  const isBoldTemplate = template === "bold" || template === "modern_grid";
  const isMinimalTemplate = template === "minimal" || template === "fashion_editorial";

  const cardClass = isBoldTemplate
    ? "border-slate-800 bg-slate-900 text-white sm:shadow-[0_22px_55px_-30px_rgba(0,0,0,0.7)] hover:shadow-[0_30px_75px_-30px_rgba(5,150,105,0.5)]"
    : isMinimalTemplate
      ? "border-slate-100 bg-white sm:shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)] hover:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.25)]"
      : "border-slate-200 bg-white sm:shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] hover:shadow-[0_28px_70px_-32px_rgba(16,185,129,0.55)]";
  const titleClass = isBoldTemplate ? "text-white" : "text-slate-900";
  const metaClass = isBoldTemplate ? "text-slate-300" : "text-slate-500";
  const descriptionClass = isCompact
    ? `line-clamp-2 text-[11px] leading-4 ${metaClass}`
    : `line-clamp-2 text-[11px] leading-4 sm:text-xs sm:leading-5 ${metaClass}`;
  const priceChipClass = isBoldTemplate
    ? "bg-slate-800 text-emerald-200"
    : "bg-slate-100 text-slate-900";
  const ctaClass = isBoldTemplate
    ? "bg-emerald-500 hover:bg-emerald-400"
    : "bg-emerald-600 hover:bg-emerald-700";

  function nextSlide() {
    setIndex((prev) => (prev + 1) % images.length);
  }

  function prevSlide() {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  function goToProduct() {
    // productHref is a fully-qualified cross-origin URL exactly when this
    // product belongs to a different store than the one the current
    // subdomain is serving - Next's client-side router can't navigate
    // across origins, so that case needs a real browser navigation instead.
    if (productHref.startsWith("http")) {
      window.location.href = productHref;
    } else {
      router.push(productHref);
    }
  }

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    goToProduct();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToProduct();
  }

  function prefetchProduct() {
    if (didPrefetchRef.current) return;
    didPrefetchRef.current = true;
    router.prefetch(productHref);
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={prefetchProduct}
      onFocus={prefetchProduct}
      onTouchStart={prefetchProduct}
      className={`group cursor-pointer overflow-hidden rounded-lg  sm:rounded-[1.75rem] transition hover:-translate-y-1 ${cardClass}`}
    >
      <div className="relative overflow-hidden rounded-t-lg sm:rounded-t-[1.25rem] bg-slate-100">
        <div className={`relative w-full ${imageHeightClass}`}>
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No image
            </div>
          )}
        </div>

        <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-slate-700 backdrop-blur sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
          {product.rating_avg && product.rating_avg >= 4.5
            ? "Best Seller"
            : product.category || "Featured"}
        </span>

        <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-1.5 sm:right-3 sm:top-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white shadow-md sm:h-11 sm:w-11">
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={`${store.name} logo`}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-semibold text-slate-500">Store</span>
            )}
          </div>
        </div>

        {hasManyImages ? (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/40 rounded-full px-1 py-1 text-xs font-bold text-slate-900 hover:backdrop-blur sm:left-1 sm:px-1 sm:py-1 sm:text-sm"
              aria-label="Previous image"
            >
              {<ChevronLeft className="h-4 w-4 text-gray-600" />}
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/40 rounded-full px-1.5 py-1 text-xs font-bold text-slate-900 hover:backdrop-blur sm:right-1 sm:px-1 sm:py-1 sm:text-sm"
              aria-label="Next image"
            >
              {<ChevronRight className="h-4 w-4 text-gray-600" />}
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-1.5 py-1 sm:px-2.5 sm:py-1 backdrop-blur">
              {images.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Go to image ${dotIndex + 1}`}
                  className={`h-2 w-2 rounded-full transition ${
                    dotIndex === index ? "bg-white" : "bg-white/45"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className={contentWrapClass}>
        <div className="flex items-start justify-between gap-2">
          <Link href={storeUrl(store.slug)} target="_blank" rel="noopener noreferrer">
            <p className={`flex items-center gap-1 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${metaClass}`}>
              <span className="truncate">{store.name}</span>
              {store.is_verified ? (
                <BadgeCheck className="h-3 w-3 shrink-0 text-emerald-600" aria-label="Verified vendor" />
              ) : null}
            </p>
          </Link>
        </div>
        <h3
          className={`line-clamp-2 font-black tracking-tight leading-tight ${titleClass} ${headlineClass}`}
        >
          {product.name}
        </h3>
        <p className={descriptionClass}>
          {product.description || "Quality product from a verified local vendor."}
        </p>

        <div className="">
          <StarRating
            value={product.rating_avg}
            count={product.rating_count}
            accent="yellow"
            size="sm"
          />
        </div>

        <div className="flex items-center justify-between gap-2 [@media(max-width:360px)]:flex-wrap sm:pt-2">
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold tabular-nums sm:px-3 sm:py-1.5 sm:text-sm ${priceChipClass}`}
          >
            {formatNaira(Number(product.price))}
          </span>
          <Link
            href={productHref}
            aria-label={`Open ${product.name}`}
            title="Open product"
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition sm:h-9 sm:w-9 ${ctaClass}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >       
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="17" cy="20" r="1.5" />
              <path d="M3 4h2l2.2 10.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}