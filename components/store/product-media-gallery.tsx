"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ProductMediaGalleryProps = {
  name: string;
  imageUrl: string | null;
  imageUrls: string[] | null;
};

export function ProductMediaGallery({
  name,
  imageUrl,
  imageUrls,
}: ProductMediaGalleryProps) {
  const images = useMemo(() => {
    const list = (imageUrls ?? []).filter(Boolean);
    if (list.length > 0) return list;
    return imageUrl ? [imageUrl] : [];
  }, [imageUrl, imageUrls]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  const activeImage = images[activeIndex] ?? null;

  function move(step: number) {
    if (images.length <= 1) return;
    setActiveIndex((prev) => {
      const next = prev + step;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (images.length <= 1) return;
    setTouchStartX(event.touches[0]?.clientX ?? null);
    setTouchCurrentX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (images.length <= 1 || touchStartX === null) return;
    setTouchCurrentX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd() {
    if (images.length <= 1 || touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    const deltaX = touchCurrentX - touchStartX;
    const swipeThreshold = 40;

    if (Math.abs(deltaX) >= swipeThreshold) {
      if (deltaX < 0) {
        move(1);
      } else {
        move(-1);
      }
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  }

  return (
    <div className="space-y-3">
      <div
        className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-96"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {activeImage ? (
          <Image
            src={activeImage}
            alt={name}
            fill
            className="object-cover transition-transform duration-300"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No product image
          </div>
        )}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition ${
                index === activeIndex ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"
              }`}
            >
              <Image
                src={image}
                alt={`${name} preview ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
