"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { VendorReviewsSection } from "@/components/reviews/vendor-reviews-section";

type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    image: string | null;
    pathSegment: string;
  } | null;
};

type SellerProfileTabsProps = {
  storeId: string;
  storeSlug: string;
  initialRatingAvg: number;
  initialRatingCount: number;
};

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill={star <= Math.round(value) ? "#F59E0B" : "none"}
          stroke={star <= Math.round(value) ? "#F59E0B" : "#CBD5E1"}
          strokeWidth="1.5"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ProductReviewCard({ review, storeSlug }: { review: ProductReview; storeSlug: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      {review.product ? (
        <Link
          href={`/v/${storeSlug}/${review.product.pathSegment}`}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100"
        >
          {review.product.image ? (
            <Image
              src={review.product.image}
              alt={review.product.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : null}
        </Link>
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{review.reviewer_name}</p>
          <span className="shrink-0 text-[11px] text-slate-400">
            {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <StarDisplay value={review.rating} />
        {review.product && (
          <p className="mt-0.5 truncate text-xs text-slate-500">on {review.product.name}</p>
        )}
        {review.comment && <p className="mt-1.5 text-sm text-slate-700">{review.comment}</p>}
      </div>
    </div>
  );
}

export function SellerProfileTabs({
  storeId,
  storeSlug,
  initialRatingAvg,
  initialRatingCount,
}: SellerProfileTabsProps) {
  const [tab, setTab] = useState<"products" | "store">("products");
  const [productReviews, setProductReviews] = useState<ProductReview[] | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (tab !== "products" || productReviews !== null) return;
    let cancelled = false;
    setLoadingProducts(true);
    fetch(`/api/reviews/store-products?store_id=${storeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setProductReviews(data.reviews ?? []);
      })
      .catch(() => {
        if (!cancelled) setProductReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, storeId, productReviews]);

  return (
    <div>
      <div className="flex gap-1 rounded-full bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("products")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "products" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Product reviews
        </button>
        <button
          type="button"
          onClick={() => setTab("store")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "store" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Store reviews
        </button>
      </div>

      <div className="mt-4">
        {tab === "products" ? (
          loadingProducts ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading reviews…</p>
          ) : productReviews && productReviews.length > 0 ? (
            <div className="space-y-3">
              {productReviews.map((review) => (
                <ProductReviewCard key={review.id} review={review} storeSlug={storeSlug} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No product reviews yet.</p>
          )
        ) : (
          <VendorReviewsSection
            storeId={storeId}
            initialRatingAvg={initialRatingAvg}
            initialRatingCount={initialRatingCount}
          />
        )}
      </div>
    </div>
  );
}