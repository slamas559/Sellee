import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<StoreRecord>();

  if (storeError || !store) {
    notFound();
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, store_id, name, description, price, image_url, stock_count, is_available, created_at")
    .eq("store_id", store.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  const availableProducts = (products ?? []) as ProductRecord[];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <header
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        style={{ borderColor: store.theme_color ?? "#0ea5e9" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={`${store.name} logo`}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">Logo</div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{store.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              WhatsApp: <span className="font-medium">{store.whatsapp_number}</span>
            </p>
          </div>
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Products</h2>
          <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
            Back home
          </Link>
        </div>

        {availableProducts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No products available yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableProducts.map((product) => (
              <ProductCard key={product.id} product={product} storeSlug={store.slug} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
