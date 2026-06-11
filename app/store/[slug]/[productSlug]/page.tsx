import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import { SocialShareActions } from "@/components/shared/social-share-actions";
import { OrderButton } from "@/components/store/order-button";
import WishlistButton from "@/components/store/wishlist-button";
import { ProductMediaGallery } from "@/components/store/product-media-gallery";
import { ProductReviewsSection } from "@/components/reviews/product-reviews-section";
import { StarRating } from "@/components/store/star-rating";
import { formatNaira, formatProductPathSegment, parseProductPathSegment } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";
import { ArrowLeftIcon, PackageCheck, Share2, Store } from "lucide-react";

type ProductPageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
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
  const { productSlug } = await params;
  const supabase = createAdminSupabaseClient();
  const parsedPath = parseProductPathSegment(productSlug);

  let query = supabase
    .from("products")
    .select("id, name, description, image_url, category, is_available, slug, stores!inner(slug, is_active, name)")
    .eq("stores.slug", slug)
    .eq("stores.is_active", true);

  if (parsedPath.id) {
    query = query.eq("id", parsedPath.id);
  } else if (parsedPath.isUuidOnly) {
    query = query.eq("id", productSlug);
  } else {
    query = query.eq("slug", productSlug);
  }
  let { data: product } = await query.maybeSingle();

  if (!product && parsedPath.slugPart) {
    const { data: fallbackBySlug } = await supabase
      .from("products")
      .select("id, name, description, image_url, category, is_available, slug, stores!inner(slug, is_active, name)")
      .eq("stores.slug", slug)
      .eq("stores.is_active", true)
      .eq("slug", parsedPath.slugPart)
      .maybeSingle();
    product = fallbackBySlug ?? null;
  }

  const label =
    (product as { stores?: { name?: string } })?.stores?.name ||
    slug.replace(/[-_]+/g, " ").trim() ||
    "Store";
  const desc =
    product?.description?.replace(/\s+/g, " ").trim() ||
    `Check out this product from ${label} on Sellee.`;
  // const image = product?.image_url || "https://sellee.store/opengraph-image.png";
  const canonicalRef = product
    ? formatProductPathSegment({
        id: String((product as { id: string }).id),
        slug: (product as { slug?: string | null }).slug,
        name: product.name,
      })
    : productSlug;
  const canonical = `/store/${slug}/${canonicalRef}`;
  const image = `https://www.sellee.store/store/${slug}/${productSlug}/opengraph-image`;


  return {
    metadataBase: new URL("https://www.sellee.store"),
    title: `${product?.name || "Product"} | ${label}`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${product?.name || "Product"} | ${label} | Sellee`,
      description: desc,
      url: `https://www.sellee.store${canonical}`,
      type: "website",
      images: [{ 
        url: image,
        width: 1200,
        height: 630,
        alt: product?.name || "Product image",
        type: "image/jpeg"
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product?.name || "Product"} | ${label} | Sellee`,
      description: desc,
      images: [image],
    },
  };
}

export default async function StoreProductPage({ params, searchParams }: ProductPageProps) {
  const { slug, productSlug } = await params;
  const query = await searchParams;
  const supabase = createAdminSupabaseClient();
  const parsedPath = parseProductPathSegment(productSlug);

  const { data: store } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, store_theme_preset, storefront_config, rating_avg, rating_count, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<StoreRecord>();

  if (!store) {
    notFound();
  }

  let productQuery = supabase
    .from("products")
    .select("id, store_id, slug, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("store_id", store.id);
  if (parsedPath.id) {
    productQuery = productQuery.eq("id", parsedPath.id);
  } else if (parsedPath.isUuidOnly) {
    productQuery = productQuery.eq("id", productSlug);
  } else {
    productQuery = productQuery.eq("slug", productSlug);
  }
  let { data: product } = await productQuery.maybeSingle<ProductRecord>();

  if (!product && parsedPath.slugPart) {
    const { data: fallbackBySlug } = await supabase
      .from("products")
      .select("id, store_id, slug, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
      .eq("store_id", store.id)
      .eq("slug", parsedPath.slugPart)
      .maybeSingle<ProductRecord>();
    product = fallbackBySlug ?? null;
  }

  if (!product) {
    notFound();
  }

  const canonicalProductRef = formatProductPathSegment({
    id: product.id,
    slug: product.slug,
    name: product.name,
  });
  if (productSlug !== canonicalProductRef) {
    const from = Array.isArray(query.from) ? query.from[0] : query.from;
    const fromQuery = from ? `?from=${encodeURIComponent(from)}` : "";
    redirect(`/store/${slug}/${canonicalProductRef}${fromQuery}`);
  }

  const vendorProductsPromise = supabase
    .from("products")
    .select("id, store_id, slug, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
    .eq("store_id", store.id)
    .eq("is_available", true)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const relatedProductsPromise = product.category
    ? supabase
        .from("products")
        .select("id, store_id, slug, name, description, category, price, image_url, image_urls, rating_avg, rating_count, stock_count, is_available, created_at")
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

  const appBaseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const storeUrl = `${appBaseUrl}/store/${store.slug}`;
  const productPathRef = formatProductPathSegment({
    id: product.id,
    slug: product.slug,
    name: product.name,
  });
  const productUrl = `${appBaseUrl}/store/${store.slug}/${productPathRef}`;
  const storeLocation = [store.city, store.state, store.country].filter(Boolean).join(", ");

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: [product.image_url, ...(product.image_urls ?? [])].filter(Boolean),
    category: product.category || undefined,
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "NGN",
      price: Number(product.price),
      availability:
        product.stock_count > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    aggregateRating:
      typeof product.rating_avg === "number" && product.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating_avg,
            reviewCount: product.rating_count,
          }
        : undefined,
  };

  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const backTarget =
    from === "home"
      ? { href: "/", label: "Home" }
      : from === "marketplace"
        ? { href: "/marketplace", label: "Marketplace" }
        : from === "vendors"
          ? { href: "/vendors", label: "Vendors" }
          : { href: `/store/${store.slug}`, label: store.name };

  const isInStock = product.stock_count > 0;

  return (
    <main className="min-h-screen bg-[#f8f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* ── Breadcrumb bar ── */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-3 text-xs text-stone-500 sm:px-6">
          <Link href={backTarget.href} className="flex items-center gap-1 font-medium text-stone-700 transition-colors hover:text-emerald-700">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            {backTarget.label}
          </Link>
          <span className="text-stone-300">/</span>
          {product.category && (
            <>
              <span className="text-stone-500">{product.category}</span>
              <span className="text-stone-300">/</span>
            </>
          )}
          <span className="max-w-[180px] truncate font-medium text-stone-800 sm:max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* ── Hero product section ── */}
      <div className="mx-auto max-w-7xl px-2 py-2 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 xl:gap-20">

          {/* Left — Media gallery */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)] ring-1 ring-stone-100">
              <ProductMediaGallery
                name={product.name}
                imageUrl={product.image_url}
                imageUrls={product.image_urls}
              />
            </div>
            {/* Floating category pill on image */}
            {product.category && (
              <span className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm backdrop-blur-sm ring-1 ring-emerald-100">
                {product.category}
              </span>
            )}
          </div>

          {/* Right — Product info */}
          <div className="flex flex-col gap-0 lg:sticky lg:top-8 lg:self-start">

            <div className="p-2">
              {/* Store chip */}
              <div className="mb-4 flex items-center justify-between">
                <Link
                  href={`/store/${store.slug}`}
                  className="group flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
                >
                  {store.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo_url} alt={store.name} className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                      <Store className="h-3 w-3 text-emerald-700" />
                    </span>
                  )}
                  <span className="text-xs font-semibold text-stone-700 group-hover:text-emerald-700">{store.name}</span>
                  {storeLocation && (
                    <span className="hidden text-[10px] text-stone-400 sm:inline">· {storeLocation}</span>
                  )}
                </Link>

                {/* Share + Wishlist actions */}
                <div className="flex items-center gap-2">
                  <WishlistButton productId={product.id} />
                  <SocialShareActions
                    mode="menu"
                    url={productUrl}
                    title={`${product.name} - ${store.name}`}
                    text={`Found this on Sellee: ${product.name} at ${store.name}.`}
                    compact
                    align="right"
                    triggerLabel="Share"
                  />
                </div>
              </div>

              {/* Product name */}
              <h1 className="text-3xl font-black tracking-tight text-stone-900 sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
                {product.name}
              </h1>

              {/* Rating row */}
              <div className="mt-3 flex items-center gap-3">
                <StarRating value={product.rating_avg} count={product.rating_count} size="md" accent="yellow" />
                {product.rating_count > 0 && (
                  <span className="text-xs text-stone-400">({product.rating_count} reviews)</span>
                )}
              </div>

              {/* Price */}
              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-4xl font-black tracking-tight text-stone-900">
                  {formatNaira(Number(product.price))}
                </span>
              </div>

              {/* Divider */}
              <div className="my-5 h-px bg-gradient-to-r from-stone-200 via-stone-100 to-transparent" />

              {/* Description */}
              <p className="text-sm leading-relaxed text-stone-600">
                {product.description ?? "No description added for this product yet."}
              </p>

              {/* Stock + badge row */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    isInStock
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-red-50 text-red-600 ring-1 ring-red-200"
                  }`}
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  {isInStock ? `${product.stock_count} in stock` : "Out of stock"}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                  WhatsApp order
                </span>
              </div>
            </div>

            {/* Vendor mini-card */}
            <div className="mt-5 overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <Link href={storeUrl} className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.logo_url} alt={store.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-stone-100" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 ring-2 ring-stone-100">
                        <Store className="h-4 w-4 text-emerald-700" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-stone-800">{store.name}</p>
                      <div className="mt-0.5">
                        <StarRating value={store.rating_avg} count={store.rating_count} size="sm" accent="yellow" />
                      </div>
                    </div>
                  </div>
                </Link>
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
            </div>

            {/* CTA */}
            <div className="mt-5">
              <OrderButton
                storeId={store.id}
                productId={product.id}
                productName={product.name}
                productPrice={Number(product.price)}
                storeName={store.name}
                whatsappNumber={store.whatsapp_number}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="mx-auto max-w-7xl px-2 pb-2 sm:px-4">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          {/* Section header */}
          <div className="border-b border-stone-100 px-5 py-5 sm:px-7">
            <h2 className="text-lg font-bold text-stone-900">Customer Reviews</h2>
          </div>
          {/* Reviews content — constrained width so it doesn't sprawl */}
          <div className="p-2 sm:px-5 lg:max-w-3xl">
            <ProductReviewsSection
              productId={product.id}
              initialRatingAvg={product.rating_avg}
              initialRatingCount={product.rating_count}
            />
          </div>
        </div>
      </div>

      {/* ── More from this vendor ── */}
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-bold text-stone-900">More from {store.name}</h2>
              <p className="mt-0.5 text-xs text-stone-400">Other products by this vendor</p>
            </div>
            <Link
              href={`/store/${store.slug}`}
              className="rounded-full border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              view store
            </Link>
          </div>

          <div className="p-4 sm:p-6">
            {vendorProducts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-5 py-6 text-center text-sm text-stone-400">
                No other products from this vendor yet.
              </p>
            ) : (
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {vendorProducts.map((item) => (
                  <div
                    key={item.id}
                    className="w-[47%] min-w-[160px] max-w-[240px] shrink-0 snap-start sm:max-w-[250px]"
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
          </div>
        </div>
      </div>

      {/* ── Related products ── */}
      <div className="mx-auto max-w-7xl px-2 pb-14 sm:px-6">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-bold text-stone-900">You may also like</h2>
              {product.category && (
                <p className="mt-0.5 text-xs text-stone-400">More in {product.category}</p>
              )}
            </div>
            <Link
              href="/marketplace"
              className="rounded-full border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              Marketplace
            </Link>
          </div>

          <div className="p-4 sm:p-6">
            {relatedProducts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-5 py-6 text-center text-sm text-stone-400">
                Related products will appear here as more vendors list this category.
              </p>
            ) : (
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {relatedProducts.map((item) => (
                  <div
                    key={item.id}
                    className="w-[47%] min-w-[160px] max-w-[220px] shrink-0 snap-start sm:max-w-[250px]"
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
          </div>
        </div>
      </div>
    </main>
  );
}