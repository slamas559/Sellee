"use client";

import { useCallback, useEffect, useState } from "react";
import { StarRating } from "@/components/store/star-rating";

type VendorReviewsSectionProps = {
  storeId: string;
  initialRatingAvg: number | null;
  initialRatingCount: number;
};

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type VendorReviewResponse = {
  reviews?: Review[];
  summary?: {
    rating_avg: number;
    rating_count: number;
  };
  error?: string;
};

export function VendorReviewsSection({
  storeId,
  initialRatingAvg,
  initialRatingCount,
}: VendorReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    rating_avg: initialRatingAvg ?? 0,
    rating_count: initialRatingCount ?? 0,
  });

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reviews/vendor?store_id=${storeId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as VendorReviewResponse;
      if (!response.ok) {
        setError(payload.error ?? "Could not load vendor reviews.");
        return;
      }
      setReviews(payload.reviews ?? []);
      if (payload.summary) {
        setSummary(payload.summary);
      }
    } catch {
      setError("Network error while loading vendor reviews.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadReviews();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadReviews]);

  // Note: Submission UI removed. Reviews are read-only here; server-side
  // enforcement should allow writes only for eligible customers (delivered orders).

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Vendor Ratings & Comments</h2>
        <StarRating
          value={summary.rating_avg}
          count={summary.rating_count}
          size="md"
          accent="yellow"
        />
      </div>

      {/* Submission UI removed intentionally. Reviews are displayed read-only. */}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading reviews...</p> : null}
        {!loading && reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No vendor reviews yet.</p>
        ) : null}
        {!loading &&
          reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{review.reviewer_name}</p>
                <StarRating value={review.rating} count={0} />
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-400">
                {new Date(review.created_at).toLocaleString()}
              </p>
            </article>
          ))}
      </div>
    </section>
  );
}
