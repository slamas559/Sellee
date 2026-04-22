import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorReviewsSection } from "@/components/reviews/vendor-reviews-section";
import { ProductCard } from "@/components/store/product-card";
import { StarRating } from "@/components/store/star-rating";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord, StoreTemplate } from "@/types";

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

function TemplateNav({ storeSlug }: { storeSlug: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      <Link href={`/store/${storeSlug}`} className="rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white">
        All Products
      </Link>
      <a href="#vendor-reviews" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
        Reviews
      </a>
      <a href="#contact" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
        Contact
      </a>
    </nav>
  );
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<StoreRecord>();

  if (storeError || !store) {
    notFound();
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("store_id", store.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  const availableProducts = (products ?? []) as ProductRecord[];
  const template: StoreTemplate = store.store_template ?? "classic";

  if (template === "bold") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 bg-slate-950 px-4 py-6 sm:px-6">
        <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 shadow-sm">
          <div className="absolute -right-16 -top-10 h-44 w-44 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                {store.logo_url ? (
                  <Image src={store.logo_url} alt={`${store.name} logo`} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">Logo</div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">{store.name}</h1>
                <p className="mt-1 text-sm text-slate-300">
                  WhatsApp: <span className="font-semibold">{store.whatsapp_number}</span>
                </p>
                <div className="mt-2">
                  <StarRating value={store.rating_avg} count={store.rating_count} size="md" />
                </div>
              </div>
            </div>
            <TemplateNav storeSlug={store.slug} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {availableProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                template={template}
                store={{
                  name: store.name,
                  slug: store.slug,
                  logo_url: store.logo_url,
                  rating_avg: store.rating_avg,
                  rating_count: store.rating_count,
                }}
              />
            ))}
          </div>

          <aside id="contact" className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Vendor Info</h2>
            <p className="text-sm text-slate-300">
              Template: <span className="font-semibold text-emerald-300">{template}</span>
            </p>
            <p className="text-sm text-slate-300">
              Products: <span className="font-semibold text-white">{availableProducts.length}</span>
            </p>
            <p className="text-sm text-slate-300">
              Contact: <span className="font-semibold text-white">{store.whatsapp_number}</span>
            </p>
            <Link
              href={`https://wa.me/${store.whatsapp_number}`}
              className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              Chat Vendor
            </Link>
          </aside>
        </section>

        <section id="vendor-reviews">
          <VendorReviewsSection
            storeId={store.id}
            initialRatingAvg={store.rating_avg}
            initialRatingCount={store.rating_count}
          />
        </section>
      </main>
    );
  }

  if (template === "minimal") {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 bg-white px-4 py-8 sm:px-6">
        <header className="space-y-3 border-b border-slate-200 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{store.name}</h1>
            <TemplateNav storeSlug={store.slug} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>{store.whatsapp_number}</span>
            <span className="text-slate-300">-</span>
            <StarRating value={store.rating_avg} count={store.rating_count} />
          </div>
        </header>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Products</h2>
          {availableProducts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              No products available yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {availableProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  template={template}
                  store={{
                    name: store.name,
                    slug: store.slug,
                    logo_url: store.logo_url,
                    rating_avg: store.rating_avg,
                    rating_count: store.rating_count,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section id="vendor-reviews">
          <VendorReviewsSection
            storeId={store.id}
            initialRatingAvg={store.rating_avg}
            initialRatingCount={store.rating_count}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 bg-slate-50 px-4 py-8 sm:px-6">
      <header
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        style={{ borderColor: store.theme_color ?? "#0ea5e9" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {store.logo_url ? (
                <Image src={store.logo_url} alt={`${store.name} logo`} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">Logo</div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{store.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                WhatsApp: <span className="font-medium">{store.whatsapp_number}</span>
              </p>
              <div className="mt-2">
                <StarRating
                  value={store.rating_avg}
                  count={store.rating_count}
                  size="md"
                  accent="yellow"
                />
              </div>
            </div>
          </div>
          <TemplateNav storeSlug={store.slug} />
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Products</h2>
          <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline">
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
              <ProductCard
                key={product.id}
                product={product}
                template={template}
                store={{
                  name: store.name,
                  slug: store.slug,
                  logo_url: store.logo_url,
                  rating_avg: store.rating_avg,
                  rating_count: store.rating_count,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section id="vendor-reviews">
        <VendorReviewsSection
          storeId={store.id}
          initialRatingAvg={store.rating_avg}
          initialRatingCount={store.rating_count}
        />
      </section>
    </main>
  );
}

