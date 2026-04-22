"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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

  const activeImage = images[activeIndex] ?? null;

  return (
    <div className="space-y-3">
      <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-96">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No product image
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                index === activeIndex ? "border-emerald-500" : "border-slate-200"
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
