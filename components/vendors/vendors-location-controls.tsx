"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function VendorsLocationControls() {
  const searchParams = useSearchParams();
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectedLocation = searchParams.get("location") ?? "";

  function updateLocationInUrl(location: string) {
    const url = new URL(window.location.href);
    if (location.trim()) {
      url.searchParams.set("location", location.trim());
    } else {
      url.searchParams.delete("location");
    }
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
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const response = await fetch(
            `/api/location/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`,
            { cache: "no-store" },
          );

          if (!response.ok) {
            updateLocationInUrl("");
            return;
          }

          const payload = (await response.json()) as {
            location?: {
              city?: string | null;
              state?: string | null;
              country?: string | null;
              display_name?: string | null;
            };
          };

          const city = payload.location?.city?.trim() ?? "";
          const state = payload.location?.state?.trim() ?? "";
          const country = payload.location?.country?.trim() ?? "";
          const label =
            [city, state, country].filter(Boolean).join(", ") ||
            payload.location?.display_name?.trim() ||
            "";

          updateLocationInUrl(label);
        } catch {
          setError("Could not detect location.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError("Location permission denied.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function clearLocation() {
    updateLocationInUrl("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isLocating}
        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 sm:text-sm"
      >
        {isLocating ? "Detecting..." : "Use my location"}
      </button>
      <button
        type="button"
        onClick={clearLocation}
        className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
      >
        Clear location
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {!error && detectedLocation ? (
        <p className="text-xs text-emerald-700">Detected: {detectedLocation}</p>
      ) : null}
    </div>
  );
}
