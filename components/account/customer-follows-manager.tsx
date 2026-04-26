"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type FollowStore = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

export function CustomerFollowsManager({ initialFollows }: { initialFollows: FollowStore[] }) {
  const [follows, setFollows] = useState<FollowStore[]>(initialFollows);
  const [error, setError] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadFollows = async () => {
    setError(null);
    const response = await fetch("/api/account/follows");
    const payload = (await response.json().catch(() => null)) as
      | { follows?: FollowStore[]; error?: string }
      | null;
    if (!response.ok) {
      setError(payload?.error ?? "Could not load follows.");
      return;
    }
    setFollows(payload?.follows ?? []);
  };

  const followBySlug = () => {
    if (!storeSlug.trim()) return;
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/account/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_slug: storeSlug.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not follow store.");
        return;
      }
      setStoreSlug("");
      await loadFollows();
    });
  };

  const unfollow = (storeId: string) => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/account/follows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not unfollow store.");
        return;
      }
      await loadFollows();
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-emerald-700">My Follows</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Followed Stores</h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={storeSlug}
          onChange={(event) => setStoreSlug(event.target.value)}
          placeholder="Enter store slug (e.g. moores-furniture)"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
        />
        <button
          type="button"
          onClick={followBySlug}
          disabled={isPending || !storeSlug.trim()}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Follow Store"}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        You can copy a store slug from any store URL: <code>/store/store-slug</code>
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {follows.length === 0 ? (
        <p className="text-sm text-slate-600">You are not following any store yet.</p>
      ) : (
        <div className="space-y-2">
          {follows.map((store) => (
            <article key={store.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div>
                <Link href={`/store/${store.slug}`} className="text-sm font-semibold text-slate-900 hover:text-emerald-700">
                  {store.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {[store.city, store.state, store.country].filter(Boolean).join(", ") || "No location"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => unfollow(store.id)}
                disabled={isPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Unfollow
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
