"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { useCatalog } from "@/components/layout/use-catalog";

const CLOSE_DELAY_MS = 150;

/**
 * Header "Categories" dropdown - lets a visitor browse the full niche ->
 * category tree from anywhere on the site, rather than only from the
 * homepage's category strip. Reuses the existing public /api/catalog
 * endpoint (already built for the vendor dashboard's niche picker) so
 * there's no new backend needed here.
 *
 * Opens on hover (desktop) with a short close delay so moving the mouse
 * from the button to the panel doesn't flicker it shut, AND on click (the
 * primary interaction on touch devices, which don't fire hover events).
 * Panel is horizontally centered under the trigger rather than left-anchored,
 * so it stays on-screen regardless of where the trigger sits in the header -
 * this is what lets the same component work in both the desktop and mobile
 * header rows.
 */
export function CategoriesMegaMenu({ compact = false }: { compact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { niches, error, isLoading } = useCatalog();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Clear any pending close timeout on unmount so it never fires after the
  // component is gone.
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function cancelScheduledClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function handleMouseEnter() {
    cancelScheduledClose();
    setIsOpen(true);
  }

  function handleMouseLeave() {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }

  function close() {
    cancelScheduledClose();
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Browse categories"
        className={`flex items-center gap-1.5 rounded-xl border font-semibold transition ${
          compact ? "p-2" : "px-3 py-2 text-sm"
        } ${
          isOpen
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        {compact ? null : "Categories"}
        {compact ? null : (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen ? (
        <div className="fixed left-0 right-0 top-[62px] z-50 w-full border-slate-200 bg-white shadow-xl shadow-slate-200/60 sm:top-[62px] snap-x snap-mandatory no-scrollbar">
          <div className="mx-auto sm:mx-8 max-h-[70vh] overflow-y-auto p-4">
            {isLoading ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">Loading categories...</p>
            ) : error || !niches ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">
                Couldn&apos;t load categories.{" "}
                <Link href="/marketplace" className="font-semibold text-emerald-700 hover:underline">
                  Browse the marketplace instead
                </Link>
              </p>
            ) : niches.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">No categories yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
                {niches.map((niche) => (
                  <div key={niche.id}>
                    <span className="text-emerald-700">
                        <Link
                        href={`/search?niche=${encodeURIComponent(niche.id)}&title=${encodeURIComponent(niche.name)}`}
                        onClick={close}
                        className="group flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-bold text-slate-900 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        >
                        
                        {niche.name}
                        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {niche.categories.slice(0, 8).map((cat) => (
                        <li key={cat.id}>
                        <span className="text-slate-600">
                          <Link
                            href={`/search?niche=${encodeURIComponent(niche.id)}&category=${encodeURIComponent(cat.name)}&title=${encodeURIComponent(cat.name)}`}
                            onClick={close}
                            className="block rounded-lg px-1.5 py-1 text-xs text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {cat.name}
                          </Link>
                        </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <Link
              href="/marketplace"
              onClick={close}
              className="text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
            >
              Browse everything in the marketplace →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}