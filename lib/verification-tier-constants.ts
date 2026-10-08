// lib/verification-tier-constants.ts
//
// Pure constants + types for vendor badge tiers. Safe to import from both
// server code and client components.

export type VerificationTier = "none" | "verified" | "trusted" | "top_seller";

export const TIER_RANK: Record<VerificationTier, number> = {
  none: 0,
  verified: 1,
  trusted: 2,
  top_seller: 3,
};

export const TIER_LABEL: Record<VerificationTier, string> = {
  none: "Not verified",
  verified: "Verified",
  trusted: "Trusted Seller",
  top_seller: "Top Seller",
};

export function isVerificationTier(value: unknown): value is VerificationTier {
  return value === "none" || value === "verified" || value === "trusted" || value === "top_seller";
}

/**
 * The tier to DISPLAY for a store row. Uses verification_tier when the query
 * selected it, and falls back to the is_verified flag for rows that only
 * carry that.
 */
export function effectiveTier(store: {
  verification_tier?: string | null;
  is_verified?: boolean | null;
}): VerificationTier {
  if (isVerificationTier(store.verification_tier) && store.verification_tier !== "none") {
    return store.verification_tier;
  }
  return store.is_verified ? "verified" : "none";
}

// Tune these as real data comes in.
//  - orders:   buyer-confirmed delivered orders, after the per-buyer cap
//  - reviews:  lifetime review count
//  - rating:   needed to EARN the tier
//  - ratingFloor: a store that already holds the tier keeps it above this
//  - buyers:   distinct buyers among those orders
export const TIER_THRESHOLDS = {
  trusted: { orders: 10, reviews: 5, rating: 3.5, ratingFloor: 3.2, buyers: 5, storeAgeDays: 30 },
  top_seller: { orders: 50, reviews: 20, rating: 4.5, ratingFloor: 4.2, buyers: 15, storeAgeDays: 90 },
} as const;

// A repeat customer is a good sign, but one buyer can only contribute this
// many orders toward the threshold.
export const MAX_ORDERS_PER_BUYER = 3;

// Ratings and reports are judged over this window, so an old good record
// can't shield a vendor who has gone bad.
export const RECENT_WINDOW_DAYS = 90;
export const MIN_RECENT_REVIEWS_FOR_WINDOW = 5;

// One actioned report in the window caps the store at Verified. This many
// removes the badge until the reports age out or an admin reinstates it.
export const REPORTS_CAP_AT_VERIFIED = 1;
export const REPORTS_AUTO_SUSPEND = 3;

// Failing daily runs in a row before a performance tier is actually dropped.
export const DEMOTION_STRIKES_REQUIRED = 2;
