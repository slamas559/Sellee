"use client";
import { useEffect, useState } from "react";
import MarketplaceFilterForm, { SearchState, CategoryGroup } from "./marketplace-filter-form";

type FilterButtonProps = {
  state: SearchState;
  categories: string[];
  grouped_categories: CategoryGroup[];
  hasLocationFilter: boolean;
  activeFilters?: string[] | null; // e.g. ["category:electronics", "niche:mobile", "sort:price_asc", "loc:Lagos"]
};

export function FilterButton({ state, categories, grouped_categories, hasLocationFilter }: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // lock body scroll when overlay is open
    if (typeof window === "undefined") return;
    const prev = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isOpen]);

  return (
    <div className="sticky top-30 z-50 lg:hidden">
      <button
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-3xl border shadow-sm border-emerald-200/80 px-4 py-2 bg-white/30 backdrop-blur-sm gap-1.5 text-sm font-semibold text-slate-800"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-emerald-700" aria-hidden="true">
          <path d="M3 5h18" />
          <path d="M6 12h12" />
          <path d="M10 19h4" />
        </svg>
        Filters
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />

          <div className="relative ml-auto w-full max-w-md bg-white p-4 max-h-screen overflow-auto -webkit-overflow-scrolling-touch">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Filters</h3>
              <button onClick={() => setIsOpen(false)} className="text-sm text-slate-600">Close</button>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <MarketplaceFilterForm
                state={state}
                categories={categories}
                groupedCategories={grouped_categories}
                hasLocationFilter={hasLocationFilter}
                containerClassName="pb-8"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
