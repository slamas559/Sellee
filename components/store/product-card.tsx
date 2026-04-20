import Image from "next/image";
import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { ProductRecord } from "@/types";

type ProductCardProps = {
  product: ProductRecord;
  storeSlug: string;
};

export function ProductCard({ product, storeSlug }: ProductCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-44 w-full bg-slate-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No image
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
        <p className="text-sm font-medium text-slate-700">{formatNaira(Number(product.price))}</p>
        <p className="line-clamp-2 text-sm text-slate-600">{product.description ?? "No description"}</p>

        <Link
          href={`/store/${storeSlug}/${product.id}`}
          className="inline-flex rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          View product
        </Link>
      </div>
    </article>
  );
}
