"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AttributionControl, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import {
  Compass,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Store as StoreIcon,
  Users,
  X,
} from "lucide-react";

type VendorPin = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  theme_color: string | null;
  rating_avg: number;
  rating_count: number;
  niche_names: string[];
  follower_count: number;
  distance_km: number | null;
};

type CatalogCategory = { id: string; slug: string; name: string };
type CatalogNiche = { id: string; slug: string; name: string; categories: CatalogCategory[] };

type LocationSearchResult = {
  display_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

// Sensible default center for a Nigeria-focused marketplace when the
// visitor hasn't shared their location and hasn't searched anywhere yet.
const DEFAULT_CENTER: [number, number] = [6.5244, 3.3792]; // Lagos
const DEFAULT_RADIUS_KM = 50;
const DEFAULT_ZOOM = 12;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );
}

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "S";
}

function vendorIcon(vendor: VendorPin): L.DivIcon {
  const color = vendor.theme_color?.trim() || "#059669";
  const inner = vendor.logo_url
    ? `<img src="${escapeHtml(vendor.logo_url)}" alt="" class="h-full w-full rounded-full object-cover" />`
    : `<span class="flex h-full w-full items-center justify-center text-[13px] font-bold text-white">${escapeHtml(initials(vendor.name))}</span>`;

  return L.divIcon({
    className: "sellee-vendor-marker",
    html: `
      <div class="vendor-pin" style="--pin-color:${color}">
        <div class="vendor-pin-body">${inner}</div>
        <div class="vendor-pin-tail"></div>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -44],
  });
}

const USER_LOCATION_ICON = L.divIcon({
  className: "sellee-user-marker",
  html: `<div class="user-dot"><div class="user-dot-pulse"></div></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Bridges imperative map control (flyTo) with surrounding React state, and
 * detects when the person has manually panned/zoomed so we can show a
 * "Search this area" prompt instead of silently re-fetching on every tiny
 * drag.
 */
function MapController({
  flyToTarget,
  onUserInteraction,
}: {
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
  onUserInteraction: () => void;
}) {
  const map = useMap();
  const isProgrammaticMove = useRef(false);

  useEffect(() => {
    if (!flyToTarget) return;
    isProgrammaticMove.current = true;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? DEFAULT_ZOOM, { duration: 1 });
    const timeout = setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 1200);
    return () => clearTimeout(timeout);
  }, [flyToTarget, map]);

  useMapEvents({
    dragend: () => {
      if (!isProgrammaticMove.current) onUserInteraction();
    },
    zoomend: () => {
      if (!isProgrammaticMove.current) onUserInteraction();
    },
  });

  return null;
}

// Reads the live Leaflet map instance up into a ref the surrounding
// component can use imperatively (for the custom zoom buttons, which live
// outside the MapContainer's own React tree and so can't call useMap()).
function MapInstanceCapture({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function StarRating({ value, count }: { value: number; count: number }) {
  if (count === 0) return <span className="text-xs text-slate-400">No ratings yet</span>;
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
      <span className="font-normal text-slate-400">({count})</span>
    </span>
  );
}

export default function VendorsMap() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [vendors, setVendors] = useState<VendorPin[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Lagos, Nigeria");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [niches, setNiches] = useState<CatalogNiche[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapPositionRef = useRef<{ lat: number; lng: number }>(center);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const fetchVendors = useCallback(async (point: { lat: number; lng: number }, category: string | null) => {
    setIsLoadingVendors(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(point.lat),
        lng: String(point.lng),
        radius_km: String(DEFAULT_RADIUS_KM),
        limit: "100",
      });
      if (category) params.set("category", category);

      const response = await fetch(`/api/vendors/nearby?${params.toString()}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Could not load vendors for this area.");
        setVendors([]);
        return;
      }

      setVendors((data.vendors ?? []) as VendorPin[]);
    } catch {
      setError("Network error loading vendors.");
      setVendors([]);
    } finally {
      setIsLoadingVendors(false);
    }
  }, []);

  // Fires on mount AND whenever the category filter changes (a useEffect
  // with a dependency array always runs once on mount too, so a separate
  // "initial load" effect alongside this one would just double-fetch).
  // Deferred via setTimeout(fn, 0) rather than calling fetchVendors
  // directly - fetchVendors sets loading/error state synchronously before
  // its first await, and calling it directly as an effect-body statement
  // means that setState happens within the effect's own synchronous
  // execution, which React flags. Deferring by one tick moves it out of
  // that frame with no perceptible delay.
  useEffect(() => {
    const timeout = setTimeout(() => fetchVendors(mapPositionRef.current, selectedCategory), 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Lazy-load the niche/category catalog only when the filter panel opens.
  useEffect(() => {
    if (!showFilters || niches.length > 0) return;
    fetch("/api/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { niches?: CatalogNiche[] } | null) => {
        if (data?.niches) setNiches(data.niches.filter((n) => n.categories.length > 0));
      })
      .catch(() => {});
  }, [showFilters, niches.length]);

  // Debounced location search-as-you-type. No need to clear searchResults
  // for a short query here - the results dropdown is already gated on
  // `searchQuery.trim().length >= 3` at render time, so stale results just
  // stay hidden rather than needing an explicit reset.
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) return;

    const timeout = setTimeout(() => {
      setIsSearchingLocation(true);
      fetch(`/api/location/search?q=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { results?: LocationSearchResult[] } | null) => setSearchResults(data?.results ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearchingLocation(false));
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function moveTo(point: { lat: number; lng: number }, label: string) {
    mapPositionRef.current = point;
    setCenter(point);
    setFlyToTarget({ ...point, zoom: DEFAULT_ZOOM });
    setLocationLabel(label);
    setShowSearchArea(false);
    fetchVendors(point, selectedCategory);
  }

  function selectSearchResult(result: LocationSearchResult) {
    const label = [result.city, result.state].filter(Boolean).join(", ") || result.display_name;
    moveTo({ lat: result.lat, lng: result.lng }, label);
    setSearchQuery("");
    setSearchResults([]);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location access.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(point);
        moveTo(point, "Your location");
        setIsLocating(false);
      },
      () => {
        setError("Couldn't access your location. Please allow location access or search a place instead.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function searchThisArea() {
    moveTo(mapPositionRef.current, "This area");
  }

  const handleMapInstanceReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const allCategoryChips = useMemo(
    () =>
      niches.flatMap((niche) =>
        niche.categories.map((cat) => ({ id: cat.id, name: cat.name, nicheName: niche.name })),
      ),
    [niches],
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <style jsx global>{`
        .vendor-pin {
          position: relative;
          width: 38px;
          height: 46px;
          filter: drop-shadow(0 6px 10px rgba(15, 23, 42, 0.28));
          transition: transform 0.15s ease;
        }
        .sellee-vendor-marker:hover .vendor-pin {
          transform: translateY(-3px) scale(1.06);
        }
        .vendor-pin-body {
          position: absolute;
          top: 0;
          left: 3px;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: var(--pin-color);
          border: 2.5px solid white;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vendor-pin-tail {
          position: absolute;
          bottom: 2px;
          left: 15px;
          width: 8px;
          height: 8px;
          background: var(--pin-color);
          transform: rotate(45deg);
          border-radius: 0 0 3px 0;
        }
        .user-dot {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #2563eb;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          position: relative;
        }
        .user-dot-pulse {
          position: absolute;
          inset: -8px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.35);
          animation: sellee-pulse 1.8s ease-out infinite;
        }
        @keyframes sellee-pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
          width: 240px !important;
        }
        .leaflet-popup-tip {
          box-shadow: none;
        }
        .leaflet-control-zoom {
          display: none !important;
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.85) !important;
          font-size: 10px !important;
          border-radius: 6px 0 0 0 !important;
        }
      `}</style>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <AttributionControl position="bottomleft" prefix={false} />

        <MapController flyToTarget={flyToTarget} onUserInteraction={() => setShowSearchArea(true)} />
        <MapInstanceCapture onReady={handleMapInstanceReady} />

        {userLocation ? <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_LOCATION_ICON} /> : null}

        {vendors
          .filter((v) => v.latitude !== null && v.longitude !== null)
          .map((vendor) => (
            <Marker
              key={vendor.id}
              position={[vendor.latitude as number, vendor.longitude as number]}
              icon={vendorIcon(vendor)}
            >
              <Popup>
                <div className="p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                      {vendor.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <StoreIcon className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{vendor.name}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {[vendor.city, vendor.state].filter(Boolean).join(", ") || "Location unavailable"}
                      </p>
                    </div>
                  </div>

                  {vendor.niche_names.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {vendor.niche_names.slice(0, 3).map((n) => (
                        <span key={n} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between">
                    <StarRating value={vendor.rating_avg} count={vendor.rating_count} />
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Users className="h-3 w-3" /> {vendor.follower_count}
                    </span>
                  </div>

                  {vendor.distance_km !== null ? (
                    <p className="mt-1 text-[11px] text-slate-400">{vendor.distance_km.toFixed(1)} km away</p>
                  ) : null}

                  <Link
                    href={`/store/${vendor.slug}`}
                    className="mt-3 flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 font-semibold transition hover:bg-emerald-700"
                  >
                    <span className="text-white text-xs">Visit store</span>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating search-this-area button (Airbnb-style) */}
      {showSearchArea ? (
        <button
          type="button"
          onClick={searchThisArea}
          className="absolute left-1/2 top-24 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-slate-800 sm:top-20 cursor-pointer"
        >
          <Compass className="h-3.5 w-3.5" />
          Search this area
        </button>
      ) : null}

      {/* Vendor count pill */}
      <div className="absolute bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur">
        {isLoadingVendors ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
        ) : (
          <StoreIcon className="h-3.5 w-3.5 text-emerald-600" />
        )}
        {isLoadingVendors ? "Loading vendors..." : `${vendors.length} vendor${vendors.length === 1 ? "" : "s"} near ${locationLabel}`}
      </div>

      {/* Floating search + filter panel */}
      <div className="absolute left-3 right-3 top-3 z-[1000] sm:left-4 sm:right-auto sm:top-4 sm:w-[360px]">
        <div className="rounded-2xl border border-white/60 bg-white/95 p-2.5 shadow-xl shadow-slate-300/40 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search a city or area..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={isLocating}
              arial-label="Use my location"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
            >
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-label="Filters"
              aria-expanded={showFilters}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                showFilters || selectedCategory
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              } cursor-pointer`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {searchQuery.trim().length >= 3 ? (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
              {isSearchingLocation ? (
                <p className="px-3 py-3 text-center text-xs text-slate-500">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-slate-500">No matching locations.</p>
              ) : (
                searchResults.map((result, index) => (
                  <button
                    key={`${result.lat}-${result.lng}-${index}`}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="flex w-full items-start gap-2 border-b border-slate-50 px-3 py-2 text-left text-xs text-slate-700 last:border-b-0 hover:bg-emerald-50"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2">{result.display_name}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {showFilters ? (
            <div className="mt-2.5 border-t border-slate-100 pt-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">Filter by category</p>
                {selectedCategory ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                ) : null}
              </div>
              {allCategoryChips.length === 0 ? (
                <p className="text-xs text-slate-400">Loading categories...</p>
              ) : (
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {allCategoryChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSelectedCategory(chip.name === selectedCategory ? null : chip.name)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        chip.name === selectedCategory
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {error ? <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p> : null}
        </div>
      </div>

      {/* Custom zoom controls (driven via the captured map instance ref, not useMap(), since these buttons live outside the MapContainer's React tree) */}
      <div className="absolute bottom-5 right-3 z-[1000] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:right-4">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center border-b border-slate-100 text-slate-600 transition hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}