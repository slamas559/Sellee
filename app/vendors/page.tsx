import type { Metadata } from "next";
import Link from "next/link";
import { NearbyVendorCard, type NearbyVendor } from "@/components/landing/nearby-vendors";
import { VendorsLocationControls } from "@/components/vendors/vendors-location-controls";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Vendors",
};

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number;
};

type VendorsPageProps = {
  searchParams: Promise<{
    q?: string;
    niche?: string;
    location?: string;
    sort?: "top_rated" | "newest" | "az";
  }>;
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const filters = await searchParams;
  const query = filters.q?.trim().toLowerCase() ?? "";
  const nicheFilter = filters.niche?.trim().toLowerCase() ?? "";
  const locationFilter = filters.location?.trim().toLowerCase() ?? "";
  const sort = filters.sort ?? "newest";

  const supabase = createAdminSupabaseClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, slug, city, state, country, logo_url, rating_avg, rating_count")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(400);

  const typedStores = ((stores ?? []) as StoreRow[]);
  const storeIds = typedStores.map((store) => store.id);

  const nichesByStoreId = new Map<string, string[]>();
  if (storeIds.length > 0) {
    const { data: storeNiches } = await supabase
      .from("store_niches")
      .select("store_id, niche:niche_id(name)")
      .in("store_id", storeIds);

    for (const row of (storeNiches ??
      []) as Array<{ store_id: string; niche?: { name?: string } | null }>) {
      const nicheName = row.niche?.name?.trim();
      if (!nicheName) continue;
      const current = nichesByStoreId.get(row.store_id) ?? [];
      current.push(nicheName);
      nichesByStoreId.set(row.store_id, current);
    }
  }

  const vendors: NearbyVendor[] = typedStores.map((store) => ({
    ...store,
    distance_km: null,
    niche_names: Array.from(new Set(nichesByStoreId.get(store.id) ?? [])),
  }));

  const allNiches = Array.from(
    new Set(vendors.flatMap((vendor) => (vendor.niche_names ?? []).filter(Boolean))),
  ).sort((a, b) => a.localeCompare(b));

  const filteredVendors = vendors.filter((vendor) => {
    const vendorName = vendor.name.toLowerCase();
    const vendorLocation = [vendor.city, vendor.state, vendor.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const vendorNiches = (vendor.niche_names ?? []).map((niche) => niche.toLowerCase());

    const matchesQuery = query ? vendorName.includes(query) : true;
    const matchesNiche = nicheFilter ? vendorNiches.includes(nicheFilter) : true;
    const matchesLocation = locationFilter ? vendorLocation.includes(locationFilter) : true;

    return matchesQuery && matchesNiche && matchesLocation;
  }).sort((a, b) => {
    if (sort === "az") {
      return a.name.localeCompare(b.name);
    }
    if (sort === "top_rated") {
      const aRating = Number(a.rating_avg ?? 0);
      const bRating = Number(b.rating_avg ?? 0);
      if (bRating !== aRating) {
        return bRating - aRating;
      }
      return (b.rating_count ?? 0) - (a.rating_count ?? 0);
    }
    return 0;
  });

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-7 lg:py-8">
      <header className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Seller Directory
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
              All Active Vendors
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Browse verified Sellee stores and open any vendor storefront instantly.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back home
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search vendor name..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          />
          <select
            name="niche"
            defaultValue={filters.niche ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          >
            <option value="">All niches</option>
            {allNiches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
          <input
            name="location"
            defaultValue={filters.location ?? ""}
            placeholder="Filter by city/state..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          >
            <option value="newest">Newest</option>
            <option value="top_rated">Top rated</option>
            <option value="az">A-Z</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Apply
            </button>
            <Link
              href="/vendors"
              className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <VendorsLocationControls />
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Vendor Results
          </h2>
          <p className="text-sm text-slate-600">{filteredVendors.length} found</p>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No vendors match your current filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 [@media(max-width:340px)]:grid-cols-1 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVendors.map((vendor) => (
              <NearbyVendorCard
                key={vendor.id}
                vendor={vendor}
                hasDistance={false}
                mode="grid"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
