import type { Metadata } from "next";
import Link from "next/link";
import { NearbyVendors, type NearbyVendor } from "@/components/landing/nearby-vendors";
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

export default async function VendorsPage() {
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

      <NearbyVendors
        initialVendors={vendors}
        title="All Vendors"
        subtitle="Storefronts"
        showSeeMoreLink={false}
      />
    </main>
  );
}
