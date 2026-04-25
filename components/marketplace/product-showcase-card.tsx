"use client";

import Image from "next/image";
import Link from "next/link";
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
  const images = useMemo(() => {
    const normalized = (product.image_urls ?? []).filter(Boolean);
    if (normalized.length > 0) return normalized;
    return product.image_url ? [product.image_url] : [];
  }, [product.image_url, product.image_urls]);

  const [index, setIndex] = useState(0);
  const hasManyImages = images.length > 1;
  const activeImage = images[index] ?? null;
  const isCompact = variant === "home";
  const headlineClass = isCompact ? "text-base sm:text-lg" : "text-base sm:text-lg lg:text-xl";
  const isBoldTemplate = template === "bold" || template === "modern_grid";
  const isMinimalTemplate = template === "minimal" || template === "fashion_editorial";

  const cardClass = isBoldTemplate
    ? "border-slate-800 bg-slate-900 text-white shadow-[0_22px_55px_-30px_rgba(0,0,0,0.7)] hover:shadow-[0_30px_75px_-30px_rgba(5,150,105,0.5)]"
    : isMinimalTemplate
      ? "border-slate-100 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)] hover:shadow-[0_16px_40px_-20px_rgba(16,185,129,0.25)]"
      : "border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] hover:shadow-[0_28px_70px_-32px_rgba(16,185,129,0.55)]";
  const titleClass = isBoldTemplate ? "text-white" : "text-slate-900";
  const metaClass = isBoldTemplate ? "text-slate-300" : "text-slate-500";
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

  return (
    <article
      className={`group overflow-hidden rounded-2xl border p-2 sm:rounded-[1.75rem] sm:p-3 transition hover:-translate-y-1 ${cardClass}`}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-100">
        <div className="relative h-36 w-full sm:h-52">
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

      <div className="space-y-2 px-0.5 pb-1 pt-2 sm:px-1 sm:pt-3">
        <p className={`line-clamp-1 text-xs font-semibold uppercase tracking-[0.16em] ${metaClass}`}>
          {store.name}
        </p>
        <h3
          className={`line-clamp-2 font-black tracking-tight leading-tight ${titleClass} ${headlineClass}`}
        >
          {product.name}
        </h3>
        <p className={`line-clamp-2 text-xs leading-4 sm:text-sm sm:leading-5 ${metaClass}`}>
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

        <div className="flex items-center justify-between gap-1.5 pt-1.5 sm:gap-2 sm:pt-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-base font-bold sm:px-3 sm:py-1.5 sm:text-lg ${priceChipClass}`}>
            {formatNaira(Number(product.price))}
          </span>
          <Link
            href={`/store/${store.slug}/${product.id}`}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white transition sm:px-4 sm:py-2 sm:text-sm ${ctaClass}`}
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
