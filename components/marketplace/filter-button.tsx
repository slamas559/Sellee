"use client";
import MarketplaceFilterForm, { SearchState, CategoryGroup } from "./marketplace-filter-form";

type FilterButtonProps = {
  state: SearchState;
  categories: string[];
  grouped_categories: CategoryGroup[];
  hasLocationFilter: boolean;
  activeFilters?: string[] | null; // e.g. ["category:electronics", "niche:mobile", "sort:price_asc", "loc:Lagos"]
};

export function FilterButton({state, categories, grouped_categories, hasLocationFilter, activeFilters}: FilterButtonProps) {
  return (
    <details className="sticky top-30 z-50 rounded-3xl bg-transparent lg:hidden">
        <summary className="flex cursor-pointer justify-center items-center list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
          <span className="inline-flex items-center rounded-3xl border shadow-sm border-emerald-200/80 px-4 py-2 bg-white/30 backdrop-blur-sm gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-emerald-700" aria-hidden="true">
              <path d="M3 5h18" />
              <path d="M6 12h12" />
              <path d="M10 19h4" />
            </svg>
            Filters
          </span>
        </summary>
        <div className="mt-4 border-t bg-white/95 border-slate-100 p-4 pt-4">
          <MarketplaceFilterForm
            state={state}
            categories={categories}
            groupedCategories={grouped_categories}
            hasLocationFilter={hasLocationFilter}
          />
        </div>
      </details>
  );
}    
