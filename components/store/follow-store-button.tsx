"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type FollowStoreButtonProps = {
  storeId: string;
  storeSlug: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  initialFollowing?: boolean;
  compact?: boolean;
};

export function FollowStoreButton({
  storeId,
  storeSlug,
  isLoggedIn,
  isOwner,
  initialFollowing = false,
  compact = false,
}: FollowStoreButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseClass = compact
    ? "rounded-full px-3 py-1 text-[11px] font-semibold transition"
    : "rounded-full px-4 py-2 text-sm font-semibold transition";

  if (!isLoggedIn) {
    return (
      <Link
        href="/login?callbackUrl=/vendors"
        className={`${baseClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
      >
        Follow
      </Link>
    );
  }

  if (isOwner) {
    return (
      <span className={`${baseClass} border border-slate-300 bg-white text-slate-600`}>
        Your store
      </span>
    );
  }

  const toggleFollow = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/account/follows", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isFollowing ? { store_id: storeId } : { store_slug: storeSlug }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not update follow status.");
        return;
      }
      setIsFollowing((prev) => !prev);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={isPending}
        className={`${baseClass} ${
          isFollowing
            ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? "Saving..." : isFollowing ? "Unfollow" : "Follow"}
      </button>
      {error ? <p className="max-w-[180px] text-right text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
