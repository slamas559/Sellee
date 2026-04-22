"use client";

import { useState } from "react";

type LocationFilterButtonProps = {
  radiusKm: number;
};

export function LocationFilterButton({ radiusKm }: LocationFilterButtonProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLocationInUrl(latitude: number, longitude: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", latitude.toFixed(6));
    url.searchParams.set("lng", longitude.toFixed(6));
    url.searchParams.set("radius_km", String(radiusKm));
    window.location.href = url.toString();
  }

  function clearLocationInUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("lat");
    url.searchParams.delete("lng");
    window.location.href = url.toString();
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in your browser.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationInUrl(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setError("Could not access your location. Please allow permission.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isLocating}
        className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isLocating ? "Detecting..." : "Use my location"}
      </button>

      <button
        type="button"
        onClick={clearLocationInUrl}
        className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Clear location
      </button>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
