import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderButton } from "@/components/store/order-button";
import { ProductMediaGallery } from "@/components/store/product-media-gallery";
import { ProductReviewsSection } from "@/components/reviews/product-reviews-section";
import { StarRating } from "@/components/store/star-rating";
import { formatNaira } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { ProductRecord, StoreRecord } from "@/types";

type ProductPageProps = {
  params: Promise<{ slug: string; productId: string }>;
};

export default async function StoreProductPage({ params }: ProductPageProps) {
  const { slug, productId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, store_template, rating_avg, rating_count, theme_color, is_active, created_at")
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

  const template = store.store_template ?? "classic";
  const pageClass =
    template === "bold"
      ? "bg-slate-950"
      : template === "minimal"
        ? "bg-white"
        : "bg-slate-50";
  const textTitleClass = template === "bold" ? "text-white" : "text-slate-900";
  const textMutedClass = template === "bold" ? "text-slate-300" : "text-slate-600";
  const articleClass =
    template === "bold"
      ? "overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm"
      : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm";

  return (
    <main className={`mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 ${pageClass}`}>
      <Link href={`/store/${store.slug}`} className="text-sm font-medium text-emerald-700 hover:underline">
        Back to store
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <article className={articleClass}>
          <ProductMediaGallery
            name={product.name}
            imageUrl={product.image_url}
            imageUrls={product.image_urls}
          />

          <div className="space-y-3 p-5">
            <h1 className={`text-2xl font-semibold ${textTitleClass}`}>{product.name}</h1>
            <p className={template === "bold" ? "text-lg font-semibold text-emerald-300" : "text-lg font-semibold text-slate-800"}>{formatNaira(Number(product.price))}</p>
            <StarRating
              value={product.rating_avg}
              count={product.rating_count}
              size="md"
              accent="yellow"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-medium text-slate-700">Vendor</p>
              <p className={`text-sm ${textMutedClass}`}>{store.name}</p>
              <div className="mt-1">
                <StarRating
                  value={store.rating_avg}
                  count={store.rating_count}
                  size="sm"
                  accent="yellow"
                />
              </div>
            </div>
            <p className={`text-sm ${textMutedClass}`}>{product.description ?? "No description"}</p>
            <p className={template === "bold" ? "text-xs text-slate-400" : "text-xs text-slate-500"}>Available stock: {product.stock_count}</p>
          </div>
        </article>

        <OrderButton
          storeId={store.id}
          productId={product.id}
          productName={product.name}
          productPrice={Number(product.price)}
          storeName={store.name}
          whatsappNumber={store.whatsapp_number}
        />
      </section>

      <ProductReviewsSection
        productId={product.id}
        initialRatingAvg={product.rating_avg}
        initialRatingCount={product.rating_count}
      />
    </main>
  );
}
