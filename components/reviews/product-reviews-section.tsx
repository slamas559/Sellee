"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RatingPicker } from "@/components/reviews/rating-picker";
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

export function ProductReviewsSection({
  productId,
  initialRatingAvg,
  initialRatingCount,
}: ProductReviewsSectionProps) {
  const { data: session, status } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    rating_avg: initialRatingAvg ?? 0,
    rating_count: initialRatingCount ?? 0,
  });
  const [form, setForm] = useState({
    rating: 5,
    comment: "",
  });
  const canSubmitReview = status === "authenticated";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitReview) {
      setError("Please log in to submit a product review.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          rating: form.rating,
          comment: form.comment,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not submit product review.");
        return;
      }
      setForm({ rating: 5, comment: "" });
      await loadReviews();
    } catch {
      setError("Network error while submitting product review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Product Ratings & Comments</h2>
        <StarRating
          value={summary.rating_avg}
          count={summary.rating_count}
          size="md"
          accent="yellow"
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white/90 p-3">
          <p className="text-sm font-medium text-slate-700">
            {canSubmitReview
              ? `Posting as ${session?.user?.name || "your account"}`
              : "Log in to rate this product"}
          </p>
          {canSubmitReview ? (
            <RatingPicker
              value={form.rating}
              onChange={(nextRating) =>
                setForm((prev) => ({ ...prev, rating: nextRating }))
              }
              disabled={isSubmitting}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Login to rate
            </Link>
          )}
        </div>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Comment</span>
          <textarea
            value={form.comment}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, comment: event.target.value }))
            }
            className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            placeholder="What did you like about this product?"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || !canSubmitReview}
          className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit product review"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading reviews...</p> : null}
        {!loading && reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No product reviews yet.</p>
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
