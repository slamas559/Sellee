import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderButton } from "@/components/store/order-button";
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
    .select("id, vendor_id, name, slug, logo_url, whatsapp_number, theme_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<StoreRecord>();

  if (!store) {
    notFound();
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, store_id, name, description, price, image_url, stock_count, is_available, created_at")
    .eq("id", productId)
    .eq("store_id", store.id)
    .eq("is_available", true)
    .maybeSingle<ProductRecord>();

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href={`/store/${store.slug}`} className="text-sm font-medium text-sky-700 hover:underline">
        Back to store
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-72 w-full bg-slate-100 sm:h-96">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No product image
              </div>
            )}
          </div>

          <div className="space-y-3 p-5">
            <h1 className="text-2xl font-semibold text-slate-900">{product.name}</h1>
            <p className="text-lg font-semibold text-slate-800">{formatNaira(Number(product.price))}</p>
            <p className="text-sm text-slate-600">{product.description ?? "No description"}</p>
            <p className="text-xs text-slate-500">Available stock: {product.stock_count}</p>
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
    </main>
  );
}
