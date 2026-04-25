"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import { StarRating } from "@/components/store/star-rating";
import { formatNaira } from "@/lib/format";
import type { StoreTemplate } from "@/types";

type ProductShowcaseCardProps = {
  product: {
    id: string;
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
  };
  variant?: "home" | "marketplace" | "store";
  template?: StoreTemplate;
};

export function ProductShowcaseCard({
  product,
  store,
  variant = "marketplace",
  template = "classic",
}: ProductShowcaseCardProps) {
  const router = useRouter();
  const productHref = `/store/${store.slug}/${product.id}`;
  const images = useMemo(() => {
    const normalized = (product.image_urls ?? []).filter(Boolean);
    if (normalized.length > 0) return normalized;
    return product.image_url ? [product.image_url] : [];
  }, [product.image_url, product.image_urls]);

  const [index, setIndex] = useState(0);
  const hasManyImages = images.length > 1;
  const activeImage = images[index] ?? null;
  const isCompact = variant === "home" || variant === "marketplace";
  const headlineClass = isCompact ? "text-base sm:text-lg" : "text-base sm:text-lg lg:text-xl";
  const imageHeightClass = isCompact ? "h-40 sm:h-52" : "h-36 sm:h-52";
  const contentWrapClass = isCompact
    ? "space-y-1.5 px-0.5 pb-1 pt-1.5 sm:space-y-2 sm:px-1 sm:pt-3"
    : "space-y-2 px-0.5 pb-1 pt-2 sm:px-1 sm:pt-3";
  const isBoldTemplate = template === "bold" || template === "modern_grid";
  const isMinimalTemplate = template === "minimal" || template === "fashion_editorial";

  const cardClass = isBoldTemplate
    ? "border-slate-800 bg-slate-900 text-white shadow-[0_22px_55px_-30px_rgba(0,0,0,0.7)] hover:shadow-[0_30px_75px_-30px_rgba(5,150,105,0.5)]"
    : isMinimalTemplate
      ? "border-slate-100 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)] hover:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.25)]"
      : "border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] hover:shadow-[0_28px_70px_-32px_rgba(16,185,129,0.55)]";
  const titleClass = isBoldTemplate ? "text-white" : "text-slate-900";
  const metaClass = isBoldTemplate ? "text-slate-300" : "text-slate-500";
  const descriptionClass = isCompact
    ? `line-clamp-1 text-xs leading-4 ${metaClass}`
    : `line-clamp-2 text-xs leading-4 sm:text-sm sm:leading-5 ${metaClass}`;
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

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    router.push(productHref);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(productHref);
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`group cursor-pointer overflow-hidden rounded-2xl border p-1 sm:rounded-[1.75rem] sm:p-3 transition hover:-translate-y-1 ${cardClass}`}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-100">
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

        <div className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white shadow-md sm:right-3 sm:top-3 sm:h-11 sm:w-11">
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

        {hasManyImages ? (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-900 backdrop-blur hover:bg-white sm:left-3 sm:px-2.5 sm:py-1 sm:text-sm"
              aria-label="Previous image"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-900 backdrop-blur hover:bg-white sm:right-3 sm:px-2.5 sm:py-1 sm:text-sm"
              aria-label="Next image"
            >
              {">"}
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2.5 py-1 backdrop-blur">
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
        <p className={`line-clamp-1 text-xs font-semibold uppercase tracking-[0.16em] ${metaClass}`}>
          {store.name}
        </p>
        <h3
          className={`line-clamp-2 font-black tracking-tight leading-tight ${titleClass} ${headlineClass}`}
        >
          {product.name}
        </h3>
        <p className={descriptionClass}>
          {product.description || "Quality product from a verified local vendor."}
        </p>

        <div className="pt-1">
          <StarRating
            value={product.rating_avg}
            count={product.rating_count}
            accent="yellow"
            size="sm"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5 sm:pt-2">
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-bold tabular-nums sm:px-3 sm:py-1.5 sm:text-base ${priceChipClass}`}
          >
            {formatNaira(Number(product.price))}
          </span>
          <Link
            href={productHref}
            aria-label={`Open ${product.name}`}
            title="Open product"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition sm:h-9 sm:w-9 ${ctaClass}`}
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
