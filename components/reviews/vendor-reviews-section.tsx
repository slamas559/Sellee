"use client";

import { useEffect, useState } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    rating_avg: initialRatingAvg ?? 0,
    rating_count: initialRatingCount ?? 0,
  });
  const [form, setForm] = useState({
    reviewer_name: "",
    rating: 5,
    comment: "",
  });

  async function loadReviews() {
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
  }

  useEffect(() => {
    void loadReviews();
  }, [storeId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          reviewer_name: form.reviewer_name,
          rating: form.rating,
          comment: form.comment,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not submit vendor review.");
        return;
      }
      setForm({ reviewer_name: "", rating: 5, comment: "" });
      await loadReviews();
    } catch {
      setError("Network error while submitting vendor review.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Your name</span>
          <input
            required
            value={form.reviewer_name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, reviewer_name: event.target.value }))
            }
            className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            placeholder="Abdul"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Rating</span>
          <select
            value={form.rating}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))
            }
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
          >
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Very good</option>
            <option value={3}>3 - Good</option>
            <option value={2}>2 - Fair</option>
            <option value={1}>1 - Poor</option>
          </select>
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Comment</span>
          <textarea
            value={form.comment}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, comment: event.target.value }))
            }
            className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            placeholder="How was your experience with this vendor?"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="sm:col-span-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit vendor review"}
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
