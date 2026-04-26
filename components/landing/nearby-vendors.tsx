"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type NearbyVendor = {
  id: string;
  vendor_id?: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number;
  follower_count?: number;
  distance_km: number | null;
  niche_names?: string[];
};

type NearbyVendorsProps = {
  initialVendors: NearbyVendor[];
  title?: string;
  subtitle?: string;
  showSeeMoreLink?: boolean;
};

type NearbyResponse = {
  vendors?: NearbyVendor[];
  error?: string;
};

function renderStars(value: number | null) {
  const count = Math.max(1, Math.round(value ?? 0));
  return "*".repeat(count);
}

export function NearbyVendorCard({
  vendor,
  hasDistance,
  mode = "carousel",
}: {
  vendor: NearbyVendor;
  hasDistance: boolean;
  mode?: "carousel" | "grid";
}) {
  const niches = (vendor.niche_names ?? []).filter(Boolean).slice(0, 3);
  const locationText =
    [vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ") || "Location not set";
  const isGrid = mode === "grid";

  return (
    <Link
      href={`/store/${vendor.slug}`}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md ${
        isGrid ? "h-full p-3 sm:p-4" : "p-4"
      }`}
    >
      {vendor.logo_url ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition group-hover:opacity-35"
          style={{ backgroundImage: `url(${vendor.logo_url})` }}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-white/65 via-white/80 to-white/92"
      />

      <div className="relative z-10">
        <p className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-emerald-700 sm:text-base">
          {vendor.name}
        </p>
        <p className="mt-1.5 line-clamp-2 text-xs text-slate-600 sm:mt-2 sm:line-clamp-1 sm:text-sm">
          {locationText}
        </p>
        {niches.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {niches.map((niche) => (
              <span
                key={`${vendor.id}-${niche}`}
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
              >
                {niche}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-amber-500">
          {renderStars(vendor.rating_avg)}{" "}
          <span className="text-slate-500">
            {(vendor.rating_avg ?? 0).toFixed(1)} ({vendor.rating_count})
          </span>
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <p className="font-medium text-slate-600">Followers: {vendor.follower_count ?? 0}</p>
          <p className="font-medium text-emerald-700">
            {typeof vendor.distance_km === "number"
              ? `${vendor.distance_km.toFixed(1)} km away`
              : hasDistance
                ? "Distance unavailable"
                : "Open store"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function NearbyVendors({
  initialVendors,
  title = "Vendors Near You",
  subtitle = "Vendor Discovery",
  showSeeMoreLink = true,
}: NearbyVendorsProps) {
  const [vendors, setVendors] = useState(initialVendors);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);

  const hasDistance = useMemo(
    () => vendors.some((vendor) => typeof vendor.distance_km === "number"),
    [vendors],
  );

  async function loadNearbyWithCoordinates(lat: number, lng: number) {
    const query = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius_km: "35",
      limit: "8",
    });

    const response = await fetch(`/api/vendors/nearby?${query.toString()}`, {
      cache: "no-store",
    });

    const payload = (await response.json()) as NearbyResponse;

    if (!response.ok) {
      throw new Error(payload.error ?? "Could not fetch nearby vendors.");
    }

    setVendors(payload.vendors ?? []);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in your browser.");
      return;
    }

    setLocationError(null);
    setDetectedLocation(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const reverseResponse = await fetch(
            `/api/location/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`,
            { cache: "no-store" },
          );

          if (reverseResponse.ok) {
            const reversePayload = (await reverseResponse.json()) as {
              location?: {
                city?: string | null;
                state?: string | null;
                country?: string | null;
                display_name?: string | null;
              };
            };
            const city = reversePayload.location?.city?.trim() ?? "";
            const state = reversePayload.location?.state?.trim() ?? "";
            const country = reversePayload.location?.country?.trim() ?? "";
            const label =
              [city, state, country].filter(Boolean).join(", ") ||
              reversePayload.location?.display_name?.trim() ||
              "";

            if (label) {
              setDetectedLocation(label);
            }
          }

          await loadNearbyWithCoordinates(lat, lng);
        } catch (error) {
          setLocationError(
            error instanceof Error ? error.message : "Unable to fetch nearby vendors.",
          );
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setLocationError("Location permission denied. You can still browse all vendors.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {subtitle}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {showSeeMoreLink ? (
            <Link
              href="/vendors"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              See more
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            {isLocating ? "Detecting..." : "Use my location"}
          </button>
        </div>
      </div>

      {locationError ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {locationError}
        </p>
      ) : null}
      {!locationError && detectedLocation ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Showing vendors near: {detectedLocation}
        </p>
      ) : null}

      {vendors.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No active vendors yet in this area.
        </div>
      ) : (
        <div className="mt-5 -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none sm:grid-cols-2 lg:grid-cols-4">
          {vendors.map((vendor) => (
            <NearbyVendorCard key={vendor.id} vendor={vendor} hasDistance={hasDistance} />
          ))}
        </div>
      )}
    </section>
  );
}
