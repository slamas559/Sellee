"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "counterfeit", label: "Counterfeit or fake item" },
  { value: "misleading", label: "Misleading description or photos" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

export function ReportProductButton({ productId }: { productId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("counterfeit");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/products/${productId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details, email: email || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not submit report.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors hover:text-red-600"
      >
        <Flag size={13} />
        Report
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            {submitted ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-stone-900">Thanks for letting us know</p>
                <p className="mt-1 text-xs text-stone-500">We&apos;ll take a look at this listing.</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-sm font-semibold text-stone-900">Report this listing</p>

                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Any details that would help us review this (optional)"
                  rows={3}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email, if you'd like a follow-up (optional)"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />

                {error ? <p className="text-xs text-red-600">{error}</p> : null}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-stone-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}