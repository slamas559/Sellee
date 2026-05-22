"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { LocationFilterButton } from "./location-filter-button";

export type CategoryGroup = {
  niche_id: string;
  niche_name: string;
  categories: string[];
};

export type SearchState = {
  q: string;
  niche: string;
  category: string;
  sort: "latest" | "price_asc" | "price_desc" | "distance";
  min_price: number | null;
  max_price: number | null;
  lat: number | null;
  lng: number | null;
  loc: string;
  radius_km: number;
};

function FilterLabel({ icon, children }: { icon: "search" | "tag" | "wallet" | "sort" | "map-pin"; children: ReactNode }) {
  const iconClassName = "h-3.5 w-3.5 text-slate-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
      {icon === "search" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      ) : null}
      {icon === "tag" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
          <path d="M20.5 13.5 12 22l-9-9V3h10z" />
          <circle cx="8.5" cy="8.5" r="1.3" />
        </svg>
      ) : null}
      {icon === "wallet" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
          <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
          <path d="M16 12.5h5.5" />
          <circle cx="16.8" cy="12.5" r=".5" fill="currentColor" />
        </svg>
      ) : null}
      {icon === "sort" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
          <path d="M7 4v16" />
          <path d="m4 7 3-3 3 3" />
          <path d="M17 20V4" />
          <path d="m20 17-3 3-3-3" />
        </svg>
      ) : null}
      {icon === "map-pin" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName} aria-hidden="true">
          <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      ) : null}
      {children}
    </span>
  );
}

function MarketplaceFilterForm({
  state,
  categories,
  groupedCategories,
  hasLocationFilter,
  containerClassName,
}: {
  state: SearchState;
  categories: string[];
  groupedCategories: CategoryGroup[];
  hasLocationFilter: boolean;
  containerClassName?: string;
}) {
  const visibleGroups = state.niche
    ? groupedCategories.filter((group) => group.niche_id === state.niche)
    : groupedCategories;

  return (
    <div className={containerClassName}>
      <form action="/marketplace" className="space-y-5">
        <div className="space-y-2">
          <label>
            <FilterLabel icon="search">Search</FilterLabel>
          </label>
          <input
            name="q"
            defaultValue={state.q}
            placeholder="Search products, vendors, or locations..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          />
          <p className="text-xs text-slate-500">Try: product name, vendor name, niche, category, or place (e.g. Ikeja).</p>
        </div>

        <div className="space-y-2">
          <label>
            <FilterLabel icon="tag">Niche</FilterLabel>
          </label>
          <select
            name="niche"
            defaultValue={state.niche}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          >
            <option value="">All niches</option>
            {groupedCategories.map((group) => (
              <option key={group.niche_id} value={group.niche_id}>
                {group.niche_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label>
            <FilterLabel icon="tag">Category</FilterLabel>
          </label>
          <select
            name="category"
            defaultValue={state.category}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          >
            <option value="">All categories</option>
            {visibleGroups.length > 0 ? (
              visibleGroups.map((group) => (
                <optgroup key={group.niche_id} label={group.niche_name}>
                  {group.categories.map((category) => (
                    <option key={`${group.niche_id}-${category}`} value={category}>
                      {category}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label>
              <FilterLabel icon="wallet">Min price</FilterLabel>
            </label>
            <input
              name="min_price"
              type="number"
              min="0"
              defaultValue={state.min_price ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
            />
          </div>
          <div className="space-y-2">
            <label>
              <FilterLabel icon="wallet">Max price</FilterLabel>
            </label>
            <input
              name="max_price"
              type="number"
              min="0"
              defaultValue={state.max_price ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label>
            <FilterLabel icon="sort">Sort</FilterLabel>
          </label>
          <select
            name="sort"
            defaultValue={state.sort}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          >
            <option value="latest">Latest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="distance">Distance</option>
          </select>
        </div>

        <div className="space-y-2">
          <label>
            <FilterLabel icon="map-pin">Radius (km)</FilterLabel>
          </label>
          <input
            name="radius_km"
            type="number"
            min="1"
            max="200"
            defaultValue={state.radius_km}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          />
        </div>

        <input type="hidden" name="lat" value={state.lat ?? ""} />
        <input type="hidden" name="lng" value={state.lng ?? ""} />
        <input type="hidden" name="loc" value={state.loc} />

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Apply filters
          </button>
          <Link
            href="/marketplace"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-5 border-t border-slate-200/80 pt-5">
        <LocationFilterButton radiusKm={state.radius_km} />
        {hasLocationFilter ? (
          <p className="mt-3 text-xs text-emerald-700">
            Location filter active{state.loc ? ` near ${state.loc}` : ""} at {state.radius_km} km radius.
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Enable location to prioritize nearby stores.</p>
        )}
      </div>
    </div>
  );
}

export default MarketplaceFilterForm;
