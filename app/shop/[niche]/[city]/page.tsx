import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NearbyVendorCard, type NearbyVendor } from "@/components/landing/nearby-vendors";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { getNicheLocationPageDataCached } from "@/lib/public-cache";

type PageProps = {
  params: Promise<{ niche: string; city: string }>;
};

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { niche: nicheSlug, city: citySlug } = await params;
  const data = await getNicheLocationPageDataCached(nicheSlug, citySlug);

  if (!data.niche) {
    return { title: "Not found" };
  }

  const cityLabel = data.cityLabel ?? titleCaseFromSlug(citySlug);
  const title = `${data.niche.name} vendors in ${cityLabel}`;
  const description = `Discover ${data.niche.name.toLowerCase()} vendors and products in ${cityLabel} on Sellee. Compare sellers, check reviews, and order directly through WhatsApp.`;
  const canonical = `/shop/${nicheSlug}/${citySlug}`;
  const hasResults = data.stores.length > 0;

  return {
    title,
    description,
    alternates: { canonical },
    robots: hasResults ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: `https://sellee.store${canonical}`,
      siteName: "Sellee",
      type: "website",
    },
  };
}

export default async function NicheLocationPage({ params }: PageProps) {
  const { niche: nicheSlug, city: citySlug } = await params;
  const data = await getNicheLocationPageDataCached(nicheSlug, citySlug);

  if (!data.niche) {
    notFound();
  }

  const cityLabel = data.cityLabel ?? titleCaseFromSlug(citySlug);
  const storesById = new Map(data.stores.map((store) => [store.id, store]));
  const appBaseUrl = (process.env.NEXTAUTH_URL || "https://sellee.store").replace(/\/$/, "");
  const pageUrl = `${appBaseUrl}/shop/${nicheSlug}/${citySlug}`;

  const vendorsForCards: NearbyVendor[] = data.stores.map((store) => ({
    id: store.id,
    vendor_id: store.vendor_id,
    name: store.name,
    slug: store.slug,
    city: store.city,
    state: store.state,
    country: store.country,
    logo_url: store.logo_url,
    rating_avg: store.rating_avg,
    rating_count: store.rating_count,
    distance_km: null,
    is_verified: store.is_verified,
  }));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marketplace", item: `${appBaseUrl}/marketplace` },
      { "@type": "ListItem", position: 2, name: `${data.niche.name} in ${cityLabel}`, item: pageUrl },
    ],
  };

  const vendorsJsonLd =
    data.stores.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: data.stores.map((store, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "LocalBusiness",
              name: store.name,
              url: `${appBaseUrl}/store/${store.slug}`,
              image: store.logo_url || undefined,
              address: {
                "@type": "PostalAddress",
                addressLocality: store.city || undefined,
                addressRegion: store.state || undefined,
                addressCountry: store.country || undefined,
              },
              aggregateRating:
                typeof store.rating_avg === "number" && store.rating_count > 0
                  ? { "@type": "AggregateRating", ratingValue: store.rating_avg, reviewCount: store.rating_count }
                  : undefined,
            },
          })),
        }
      : null;

  const productsJsonLd =
    data.products.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: data.products.map((product, index) => {
            const store = storesById.get(product.store_id);
            return {
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Product",
                name: product.name,
                image: product.image_url || undefined,
                description: product.description || undefined,
                brand: store?.name ? { "@type": "Brand", name: store.name } : undefined,
                offers: {
                  "@type": "Offer",
                  priceCurrency: "NGN",
                  price: product.price,
                  availability:
                    product.stock_count > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                  url: store ? `${appBaseUrl}/store/${store.slug}/${product.slug ?? product.id}` : undefined,
                },
                aggregateRating:
                  typeof product.rating_avg === "number" && product.rating_count > 0
                    ? { "@type": "AggregateRating", ratingValue: product.rating_avg, reviewCount: product.rating_count }
                    : undefined,
              },
            };
          }),
        }
      : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {vendorsJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vendorsJsonLd) }} />
      ) : null}
      {productsJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productsJsonLd) }} />
      ) : null}

      <nav className="text-xs text-slate-500">
        <Link href="/marketplace" className="hover:text-emerald-700">
          Marketplace
        </Link>
        {" / "}
        <span className="text-slate-700">
          {data.niche.name} in {cityLabel}
        </span>
      </nav>

      <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        {data.niche.name} vendors in {cityLabel}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Browse {data.niche.name.toLowerCase()} sellers based in {cityLabel} on Sellee. Compare stores, check
        reviews and ratings, and message a vendor directly on WhatsApp to place your order.
      </p>

      {data.stores.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p>
            No {data.niche.name.toLowerCase()} vendors in {cityLabel} on Sellee yet — this page will fill in as
            sellers join.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Browse the full marketplace
            </Link>
            <Link
              href="/become-vendor"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Sell on Sellee
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Vendors ({vendorsForCards.length})
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vendorsForCards.map((vendor) => (
                <NearbyVendorCard key={vendor.id} vendor={vendor} hasDistance={false} mode="grid" />
              ))}
            </div>
          </section>

          {data.products.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Products ({data.products.length})
              </h2>
              <div className="mt-3 grid grid-cols-2 justify-items-center gap-2 sm:gap-3 xl:grid-cols-4">
                {data.products.map((product) => {
                  const store = storesById.get(product.store_id);
                  if (!store) return null;
                  return (
                    <div key={product.id} className="w-full max-w-[280px]">
                      <ProductShowcaseCard product={product} store={store} variant="marketplace" />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

export const dynamicParams = true;