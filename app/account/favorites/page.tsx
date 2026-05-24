import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";

export const metadata: Metadata = {
  title: "Favorites",
};

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/account/favorites`);
  }

  const supabase = createAdminSupabaseClient();
  const { data: wishlistRows, error: wishlistError } = await supabase
    .from("wishlists")
    .select("product_id, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (wishlistError) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-3 py-8">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm text-rose-600">Error loading saved items</p>
        </div>
      </main>
    );
  }

  const productIds = (wishlistRows ?? []).map((r: any) => r.product_id).filter(Boolean);

  const items = [] as any[];
  if (productIds.length) {
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, slug, price, image_url, image_urls, description, category, store_id, rating_avg, rating_count")
      .in("id", productIds)
      .limit(100);

    const productsById = new Map((productsData ?? []).map((p: any) => [String(p.id), p]));
    for (const pid of productIds) {
      const prod = productsById.get(String(pid));
      if (prod) items.push(prod);
    }
  }

  // load store info for each product to render store logo and correct links
  const storeIds = [...new Set(items.map((it) => it.store_id).filter(Boolean))];
  let storesById = new Map();
  if (storeIds.length) {
    const { data: storesData } = await supabase
      .from("stores")
      .select("id, name, slug, logo_url, rating_avg, rating_count")
      .in("id", storeIds)
      .eq("is_active", true);

    storesById = new Map((storesData ?? []).map((s: any) => [s.id, s]));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-3 py-8">
      <header className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Saved items</h1>
        <p className="mt-1 text-sm text-slate-600">Products you saved for later.</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-600">You have no saved items yet.</p>
          <Link href="/marketplace" className="mt-3 inline-block text-sm font-semibold text-emerald-700">Browse marketplace</Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 justify-items-center gap-1 [@media(max-width:320px)]:grid-cols-1 sm:mt-5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => {
            const store = storesById.get(it.store_id) ?? { name: "Store", slug: "", logo_url: null, rating_avg: it.rating_avg, rating_count: it.rating_count };
            return (
              <div key={it.id} className="w-full max-w-[320px] space-y-2">
                <ProductShowcaseCard
                  product={it}
                  store={{ name: store.name ?? "Store", slug: store.slug ?? "", logo_url: store.logo_url ?? null, rating_avg: store.rating_avg ?? it.rating_avg, rating_count: store.rating_count ?? it.rating_count }}
                  variant="home"
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
