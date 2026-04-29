import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { SocialShareActions } from "@/components/shared/social-share-actions";
import { OrderButton } from "@/components/store/order-button";
import { ProductMediaGallery } from "@/components/store/product-media-gallery";
import { ProductReviewsSection } from "@/components/reviews/product-reviews-section";
import { StarRating } from "@/components/store/star-rating";
import { formatNaira } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";

type ProductPageProps = {
  params: Promise<{ slug: string; productId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

type ProductWithStore = ProductRecord & {
  store: {
    name: string;
    slug: string;
    logo_url: string | null;
    rating_avg: number | null;
    rating_count: number;
  };
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = slug.replace(/[-_]+/g, " ").trim() || "Product";
  return {
    title: `Product - ${label}`,
  };
}

export default async function StoreProductPage({ params, searchParams }: ProductPageProps) {
  const { slug, productId } = await params;
  const query = await searchParams;
  const supabase = createAdminSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<StoreRecord>();

  if (!store) {
    notFound();
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("id", productId)
    .eq("store_id", store.id)
    .eq("is_available", true)
    .maybeSingle<ProductRecord>();

  if (!product) {
    notFound();
  }

  const vendorProductsPromise = supabase
    .from("products")
    .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("store_id", store.id)
    .eq("is_available", true)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const relatedProductsPromise = product.category
    ? supabase
        .from("products")
        .select("id, store_id, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
        .eq("category", product.category)
        .eq("is_available", true)
        .neq("id", product.id)
        .neq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(16)
    : Promise.resolve({ data: [] as ProductRecord[] });

  const [{ data: vendorProductsData }, { data: relatedProductsData }] = await Promise.all([
    vendorProductsPromise,
    relatedProductsPromise,
  ]);

  const vendorProducts = (vendorProductsData ?? []) as ProductRecord[];
  const relatedProductsRaw = (relatedProductsData ?? []) as ProductRecord[];

  const relatedStoreIds = [...new Set(relatedProductsRaw.map((item) => item.store_id))];

  const { data: relatedStoresData } = relatedStoreIds.length
    ? await supabase
        .from("stores")
        .select("id, name, slug, logo_url, rating_avg, rating_count")
        .in("id", relatedStoreIds)
        .eq("is_active", true)
    : { data: [] as Array<Pick<StoreRecord, "id" | "name" | "slug" | "logo_url" | "rating_avg" | "rating_count">> };

  const relatedStoresById = new Map(
    ((relatedStoresData ?? []) as Array<Pick<StoreRecord, "id" | "name" | "slug" | "logo_url" | "rating_avg" | "rating_count">>)
      .map((item) => [item.id, item]),
  );

  const relatedProducts: ProductWithStore[] = relatedProductsRaw
    .map((item) => {
      const relatedStore = relatedStoresById.get(item.store_id);
      if (!relatedStore) return null;
      return {
        ...item,
        store: {
          name: relatedStore.name,
          slug: relatedStore.slug,
          logo_url: relatedStore.logo_url,
          rating_avg: relatedStore.rating_avg,
          rating_count: relatedStore.rating_count,
        },
      };
    })
    .filter((item): item is ProductWithStore => item !== null)
    .slice(0, 8);

  const textTitleClass = "text-slate-900";
  const textMutedClass = "text-slate-600";
  const articleClass = "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";
  const storeLocation = [store.city, store.state, store.country].filter(Boolean).join(", ");
  const appBaseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const storeUrl = `${appBaseUrl}/store/${store.slug}`;
  const productUrl = `${appBaseUrl}/store/${store.slug}/${product.id}`;

  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const backTarget =
    from === "home"
      ? { href: "/", label: "Back to home" }
      : from === "marketplace"
        ? { href: "/marketplace", label: "Back to marketplace" }
        : from === "vendors"
          ? { href: "/vendors", label: "Back to vendors" }
          : { href: `/store/${store.slug}`, label: "Back to store" };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 bg-slate-50 px-2 py-6 sm:px-4 sm:py-8">
      <Link href={backTarget.href} className="text-sm font-medium text-emerald-700 hover:underline">
        {backTarget.label}
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <article className={articleClass}>
          <ProductMediaGallery
            name={product.name}
            imageUrl={product.image_url}
            imageUrls={product.image_urls}
          />

          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {product.category || "Featured Product"}
                </p>
                <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${textTitleClass}`}>{product.name}</h1>
              </div>
              <p className="rounded-full bg-slate-100 px-4 py-2 text-lg font-semibold text-slate-800">
                {formatNaira(Number(product.price))}
              </p>
            </div>

            <StarRating
              value={product.rating_avg}
              count={product.rating_count}
              size="md"
              accent="yellow"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vendor</p>
                <SocialShareActions
                  mode="menu"
                  url={storeUrl}
                  title={`${store.name} on Sellee`}
                  text={`Check out ${store.name} on Sellee.`}
                  compact
                  align="right"
                  triggerLabel="Share store"
                />
              </div>
              <p className={`text-sm ${textMutedClass}`}>{store.name}</p>
              {storeLocation ? <p className={`mt-1 text-xs ${textMutedClass}`}>{storeLocation}</p> : null}
              <div className="mt-1">
                <StarRating
                  value={store.rating_avg}
                  count={store.rating_count}
                  size="sm"
                  accent="yellow"
                />
              </div>
            </div>
            <p className={`text-sm leading-6 ${textMutedClass}`}>
              {product.description ?? "No description added for this product yet."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                Stock: {product.stock_count}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                Ready for WhatsApp order
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Share Product
                </p>
                <SocialShareActions
                  mode="menu"
                  url={productUrl}
                  title={`${product.name} - ${store.name}`}
                  text={`Found this on Sellee: ${product.name} at ${store.name}.`}
                  compact
                  align="right"
                  triggerLabel="Share product"
                />
              </div>
            </div>
          </div>
        </article>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <OrderButton
            storeId={store.id}
            productId={product.id}
            productName={product.name}
            productPrice={Number(product.price)}
            storeName={store.name}
            whatsappNumber={store.whatsapp_number}
          />
        </div>
      </section>

      <ProductReviewsSection
        productId={product.id}
        initialRatingAvg={product.rating_avg}
        initialRatingCount={product.rating_count}
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 sm:text-xl">More From {store.name}</h2>
          <Link href={`/store/${store.slug}`} className="text-xs font-semibold text-emerald-700 hover:underline sm:text-sm">
            View store
          </Link>
        </div>
        {vendorProducts.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No other products from this vendor yet.
          </p>
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
            {vendorProducts.map((item) => (
              <div
                key={item.id}
                className="w-[46%] min-w-[170px] max-w-[220px] shrink-0 snap-start sm:w-full sm:max-w-[320px]"
              >
                <ProductShowcaseCard
                  product={item}
                  store={{
                    name: store.name,
                    slug: store.slug,
                    logo_url: store.logo_url,
                    rating_avg: store.rating_avg,
                    rating_count: store.rating_count,
                  }}
                  variant="store"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 sm:text-xl">Related Products</h2>
          <Link href="/marketplace" className="text-xs font-semibold text-emerald-700 hover:underline sm:text-sm">
            Explore marketplace
          </Link>
        </div>
        {relatedProducts.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Related products will appear here as more vendors list this category.
          </p>
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
            {relatedProducts.map((item) => (
              <div
                key={item.id}
                className="w-[46%] min-w-[170px] max-w-[220px] shrink-0 snap-start sm:w-full sm:max-w-[320px]"
              >
                <ProductShowcaseCard
                  product={item}
                  store={item.store}
                  variant="marketplace"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

