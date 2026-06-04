"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StarRating } from "@/components/store/star-rating";

type ProductReviewsSectionProps = {
  productId: string;
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

type ProductReviewResponse = {
  reviews?: Review[];
  summary?: {
    rating_avg: number;
    rating_count: number;
  };
  error?: string;
};

const AVATAR_COLORS = [
  ["#FDECD2", "#D97706"],
  ["#DCF5E8", "#059669"],
  ["#E0E7FF", "#4F46E5"],
  ["#FCE7F3", "#DB2777"],
  ["#FEF3C7", "#B45309"],
  ["#CFFAFE", "#0E7490"],
];

function getAvatarColors(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function ReviewerAvatar({ name }: { name: string }) {
  const [bg, text] = getAvatarColors(name);
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ backgroundColor: bg, color: text }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tracking-wide select-none"
    >
      {initial}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded-full bg-slate-200" />
        <div className="h-3 w-4/5 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

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

function RatingSummaryBar({ avg, count }: { avg: number; count: number }) {
  const pct = Math.round((avg / 5) * 100);
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 px-5 py-4">
      <div className="text-center">
        <p className="text-4xl font-black tracking-tight text-slate-900">{avg > 0 ? avg.toFixed(1) : "—"}</p>
        <StarDisplay value={avg} />
        <p className="mt-1 text-xs text-slate-400">{count} {count === 1 ? "review" : "reviews"}</p>
      </div>
      <div className="h-12 w-px bg-slate-200" />
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>Overall rating</span>
          <span className="font-semibold text-slate-700">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">Based on verified purchases</p>
      </div>
    </div>
  );
}

export function ProductReviewsSection({
  productId,
  initialRatingAvg,
  initialRatingCount,
}: ProductReviewsSectionProps) {
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
      const response = await fetch(`/api/reviews/product?product_id=${productId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ProductReviewResponse;
      if (!response.ok) {
        setError(payload.error ?? "Could not load product reviews.");
        return;
      }
      setReviews(payload.reviews ?? []);
      if (payload.summary) {
        setSummary(payload.summary);
      }
    } catch {
      setError("Network error while loading product reviews.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadReviews();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadReviews]);

  return (
    <section className="w-full rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Customer Reviews
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">What people are saying</p>
        </div>
      </div>

      {/* Summary bar */}
      <RatingSummaryBar avg={summary.rating_avg} count={summary.rating_count} />

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Reviews list */}
      <div className="mt-5 space-y-3">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && reviews.length === 0 && !error && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">No reviews yet</p>
            <p className="text-xs text-slate-300">Be the first to share your experience</p>
          </div>
        )}

        {!loading &&
          reviews.slice(0, 3).map((review) => {
            const date = new Date(review.created_at);
            const formatted = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <article
                key={review.id}
                className="group rounded-2xl border border-slate-100 bg-white p-4 transition-shadow duration-200 hover:border-slate-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <ReviewerAvatar name={review.reviewer_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {review.reviewer_name}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400">{formatted}</span>
                    </div>
                    <StarDisplay value={review.rating} />
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {/* Footer note */}
      {!loading && reviews.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Showing {Math.min(reviews.length, 3)} of {summary.rating_count} reviews · Only verified purchasers may submit reviews
        </p>
      )}
    </section>
  );
}