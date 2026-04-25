"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type BannerCarouselProps = {
  banners: string[];
  storeName: string;
  className?: string;
};

export function BannerCarousel({ banners, storeName, className = "" }: BannerCarouselProps) {
  const normalized = useMemo(
    () => Array.from(new Set(banners.map((item) => item.trim()).filter(Boolean))).slice(0, 8),
    [banners],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (normalized.length < 2) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % normalized.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [normalized]);

  if (normalized.length === 0) {
    return null;
  }

  const safeIndex = index % normalized.length;
  const active = normalized[safeIndex] ?? normalized[0];

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="relative h-full min-h-[180px] w-full">
        <Image
          src={active}
          alt={`${storeName} banner ${index + 1}`}
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>
      {normalized.length > 1 ? (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur">
          {normalized.map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={`h-1.5 w-1.5 rounded-full ${dotIndex === safeIndex ? "bg-white" : "bg-white/50"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
