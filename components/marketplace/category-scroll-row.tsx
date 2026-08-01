"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryImageUrl } from "@/lib/category-images";

type CategoryScrollRowProps = {
  categories: string[];
  niches: Array<{ id?: string; slug?: string; name?: string }>;
  activeNiche?: string;
  q?: string;
};

/**
 * The category strip needs horizontal scrolling on every screen size (there
 * are more categories than fit in one row), but on a large screen there's
 * no touch/trackpad-swipe affordance the way there is on mobile - so desktop
 * users had no visible way to know they could scroll at all. This adds
 * left/right arrow buttons (desktop only; mobile keeps the natural swipe)
 * that scroll the row and disable themselves at each end.
 */
export function CategoryScrollRow({ categories, niches, activeNiche, q }: CategoryScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [categories.length]);

  function scrollByAmount(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.7) * (direction === "left" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          aria-label="Scroll categories left"
          className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}

      <div
        ref={scrollRef}
        className="-mx-1 flex snap-x snap-mandatory no-scrollbar gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0"
      >
        {categories.map((item) => {
          const nicheObj = (niches ?? []).find(
            (n) => String(n.name ?? "").toLowerCase() === String(item).toLowerCase(),
          );
          const nicheId = nicheObj?.id ?? nicheObj?.slug ?? item;
          const href = q
            ? `/search?q=${encodeURIComponent(q)}&niche=${encodeURIComponent(nicheId)}&title=${encodeURIComponent(item)}`
            : `/search?niche=${encodeURIComponent(nicheId)}&title=${encodeURIComponent(item)}`;
          const isActive = activeNiche?.toLowerCase() === String(nicheId).toLowerCase();

          return (
            <Link
              key={item}
              href={href}
              className={`group inline-flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-2.5 py-2 pr-3 text-xs sm:text-sm font-semibold transition ${
                isActive
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <span className={`relative h-8 w-8 overflow-hidden rounded-xl ring-1 ${isActive ? "ring-white/40" : "ring-slate-200"}`}>
                <Image
                  src={categoryImageUrl(item)}
                  alt={`${item} category`}
                  fill
                  className="object-cover transition group-hover:scale-105"
                  sizes="32px"
                  unoptimized
                />
              </span>
              {item}
            </Link>
          );
        })}
      </div>

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          aria-label="Scroll categories right"
          className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}