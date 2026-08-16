"use client";

import { useEffect, useState } from "react";

export type CatalogCategory = { id: string; slug: string; name: string };
export type CatalogNiche = { id: string; slug: string; name: string; categories: CatalogCategory[] };

// Module-level cache, shared by every component instance that calls
// useCatalog(). The site header renders both a desktop and a mobile
// CategoriesMegaMenu at the same time (see components/layout/site-header.tsx)
// - without this shared cache, each instance would fire its own independent
// /api/catalog request. The fetch starts the moment the first instance
// mounts (i.e. as soon as the header loads on any page), not when the user
// opens the dropdown, so by the time someone actually clicks or hovers
// "Categories", the data has almost always already arrived and there's no
// loading flash.
let catalogPromise: Promise<CatalogNiche[]> | null = null;

function loadCatalog(): Promise<CatalogNiche[]> {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/catalog")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((data: { niches?: CatalogNiche[] }) =>
        (data.niches ?? []).filter((niche) => niche.categories.length > 0),
      )
      .catch((err) => {
        // Let the next mount retry instead of caching a permanent failure -
        // e.g. a page load during a brief network blip shouldn't mean the
        // categories menu is broken for the rest of the visit.
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

export function useCatalog() {
  const [niches, setNiches] = useState<CatalogNiche[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadCatalog()
      .then((data) => {
        if (!cancelled) setNiches(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { niches, error, isLoading: niches === null && !error };
}