"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buildLoginUrl, mainAppUrl } from "@/lib/store-url";

type FollowStoreButtonProps = {
  storeId: string;
  storeSlug: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  initialFollowing?: boolean;
  compact?: boolean;
  /** Use the storefront design tokens (radius, colours) instead of the fixed slate/emerald look. */
  themed?: boolean;
  className?: string;
};

export function FollowStoreButton({
  storeId,
  storeSlug,
  isLoggedIn,
  isOwner,
  initialFollowing = false,
  compact = false,
  themed = false,
  className = "",
}: FollowStoreButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shape = themed ? "rounded-[var(--s-r)]" : "rounded-full";
  const baseClass = `${shape} ${compact ? "px-3 py-1 text-[11px]" : "px-4 py-2 text-sm"} font-semibold transition ${className}`;
  const neutral = themed
    ? "border border-[color:var(--s-line)] bg-[var(--s-card)] text-[color:var(--s-ink)] hover:border-[color:var(--s-primary)]"
    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  const primaryAction = themed
    ? "bg-[var(--s-primary)] text-[color:var(--s-primary-ink)] hover:opacity-90"
    : "bg-emerald-600 text-white hover:bg-emerald-700";

  if (!isLoggedIn) {
    return (
      <Link
        href={buildLoginUrl(mainAppUrl("/vendors"))}
        className={`${baseClass} ${neutral}`}
      >
        Follow
      </Link>
    );
  }

  if (isOwner) {
    return (
      <span className={`${baseClass} ${neutral} opacity-80`}>
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
          isFollowing ? neutral : primaryAction
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? "Saving..." : isFollowing ? "Unfollow" : "Follow"}
      </button>
      {error ? <p className="max-w-[180px] text-right text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}