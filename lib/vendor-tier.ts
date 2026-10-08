// lib/vendor-tier.ts  (server only)
//
// Computes a store's badge tier from four things:
//   1. Identity checks   - WhatsApp confirmed, payout name matched, ID approved
//   2. Buyer-confirmed orders (self-orders excluded, per-buyer cap)
//   3. Reviews / rating (recent window preferred)
//   4. Actioned product reports + manual admin suspension
//
// The ladder is cumulative: Trusted and Top Seller require Verified first.

import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { notifyVendorOfIdDecision } from "@/lib/vendor-verification-notify";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import {
  DEMOTION_STRIKES_REQUIRED,
  MAX_ORDERS_PER_BUYER,
  MIN_RECENT_REVIEWS_FOR_WINDOW,
  RECENT_WINDOW_DAYS,
  REPORTS_AUTO_SUSPEND,
  REPORTS_CAP_AT_VERIFIED,
  TIER_RANK,
  TIER_THRESHOLDS,
  isVerificationTier,
  type VerificationTier,
} from "@/lib/verification-tier-constants";

export type TierMetrics = {
  whatsappVerified: boolean;
  payoutNameMatched: boolean;
  idApproved: boolean;
  suspended: boolean;
  /** Buyer-confirmed delivered orders after excluding self-orders and applying the per-buyer cap. */
  qualifyingOrders: number;
  distinctBuyers: number;
  /** Reviews written for one of the counted orders (reviews not tied to an order never count). */
  reviewCount: number;
  /** Average of those reviews: trailing window when there are enough recent ones, else all. */
  ratingAvg: number;
  storeAgeDays: number;
  actionedReports90d: number;
};

export type TierEvaluation = {
  verified: boolean;
  /** Tier the store qualifies for right now, using the strict thresholds. */
  earned: VerificationTier;
  /** Tier the store may KEEP, using the relaxed rating floors. */
  retained: VerificationTier;
  /** True when actioned reports are holding the store at Verified. */
  cappedByReports: boolean;
};

type StoreTierRow = {
  id: string;
  vendor_id: string;
  created_at: string;
  whatsapp_number: string | null;
  whatsapp_verified_at: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_tier: string | null;
  tier_demotion_strikes: number | null;
  verification_suspended_at: string | null;
  verification_suspended_reason: string | null;
};

export type GatheredTierData = {
  store: StoreTierRow;
  currentTier: VerificationTier;
  metrics: TierMetrics;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function meetsTier(
  metrics: TierMetrics,
  tier: "trusted" | "top_seller",
  ratingKey: "rating" | "ratingFloor",
): boolean {
  const t = TIER_THRESHOLDS[tier];
  return (
    metrics.qualifyingOrders >= t.orders &&
    metrics.reviewCount >= t.reviews &&
    metrics.ratingAvg >= t[ratingKey] &&
    metrics.distinctBuyers >= t.buyers &&
    metrics.storeAgeDays >= t.storeAgeDays
  );
}

function highestTier(metrics: TierMetrics, ratingKey: "rating" | "ratingFloor", cap: VerificationTier): VerificationTier {
  let tier: VerificationTier = "verified";
  if (meetsTier(metrics, "trusted", ratingKey)) tier = "trusted";
  if (tier === "trusted" && meetsTier(metrics, "top_seller", ratingKey)) tier = "top_seller";
  return TIER_RANK[tier] > TIER_RANK[cap] ? cap : tier;
}

/** Pure: no database access, so it's easy to reason about and test. */
export function evaluateTier(metrics: TierMetrics): TierEvaluation {
  const autoSuspended = metrics.actionedReports90d >= REPORTS_AUTO_SUSPEND;
  const verified =
    metrics.whatsappVerified &&
    metrics.payoutNameMatched &&
    metrics.idApproved &&
    !metrics.suspended &&
    !autoSuspended;

  if (!verified) {
    return { verified: false, earned: "none", retained: "none", cappedByReports: false };
  }

  const cappedByReports = metrics.actionedReports90d >= REPORTS_CAP_AT_VERIFIED;
  const cap: VerificationTier = cappedByReports ? "verified" : "top_seller";

  return {
    verified: true,
    earned: highestTier(metrics, "rating", cap),
    retained: highestTier(metrics, "ratingFloor", cap),
    cappedByReports,
  };
}

/** Pure: decides the next stored tier and demotion-strike count. */
export function decideNextTier(
  current: VerificationTier,
  strikes: number,
  evaluation: TierEvaluation,
): { tier: VerificationTier; strikes: number } {
  // Promotion, or holding steady at what's earned.
  if (TIER_RANK[evaluation.earned] >= TIER_RANK[current]) {
    return { tier: evaluation.earned, strikes: 0 };
  }

  // Lost verification entirely (identity check failed, suspended, auto-suspended)
  // or actioned reports cap the store: no grace period.
  if (!evaluation.verified || evaluation.cappedByReports) {
    return { tier: evaluation.earned, strikes: 0 };
  }

  // Performance dip. Still above the relaxed floors? Keep the tier.
  if (TIER_RANK[evaluation.retained] >= TIER_RANK[current]) {
    return { tier: current, strikes: 0 };
  }

  // Below even the floor: demote only after repeated failing runs.
  const nextStrikes = strikes + 1;
  if (nextStrikes >= DEMOTION_STRIKES_REQUIRED) {
    return { tier: evaluation.earned, strikes: 0 };
  }
  return { tier: current, strikes: nextStrikes };
}

export async function gatherTierData(storeId: string): Promise<GatheredTierData | null> {
  const supabase = createAdminSupabaseClient();
  const sinceIso = new Date(Date.now() - RECENT_WINDOW_DAYS * DAY_MS).toISOString();
  const sinceMs = Date.now() - RECENT_WINDOW_DAYS * DAY_MS;

  const { data: storeData } = await supabase
    .from("stores")
    .select(
      "id, vendor_id, created_at, whatsapp_number, whatsapp_verified_at, rating_avg, rating_count, verification_tier, tier_demotion_strikes, verification_suspended_at, verification_suspended_reason",
    )
    .eq("id", storeId)
    .maybeSingle();

  if (!storeData) return null;
  const store = storeData as StoreTierRow;

  const [payoutResult, idResult, peopleResult, linkResult, ordersResult, linkedReviewsResult, reportsResult] =
    await Promise.all([
      supabase.from("vendor_payout_accounts").select("name_match_status").eq("store_id", storeId).maybeSingle(),
      supabase
        .from("vendor_verifications")
        .select("status")
        .eq("store_id", storeId)
        .eq("type", "id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // The owner plus any staff accounts under them.
      supabase.from("users").select("id, phone").or(`id.eq.${store.vendor_id},parent_vendor_id.eq.${store.vendor_id}`),
      supabase.from("whatsapp_vendor_links").select("whatsapp_number").eq("vendor_id", store.vendor_id),
      supabase
        .from("orders")
        .select("id, customer_user_id, customer_whatsapp")
        .eq("store_id", storeId)
        .eq("status", "delivered")
        .not("buyer_confirmed_at", "is", null)
        // Oldest first, so a buyer's first few orders are the ones that count.
        .order("created_at", { ascending: true })
        .limit(10000),
      // Only reviews tied to an order can count. Which of those orders qualify
      // is decided below, so this is filtered in memory.
      supabase
        .from("vendor_reviews")
        .select("order_id, rating, created_at")
        .eq("store_id", storeId)
        .not("order_id", "is", null)
        .limit(10000),
      supabase
        .from("product_reports")
        .select("id, product:product_id!inner(store_id)", { count: "exact", head: true })
        .eq("status", "actioned")
        .gte("reviewed_at", sinceIso)
        .eq("product.store_id", storeId),
    ]);

  // Identifiers that mean "this is the vendor or their team", so their own
  // orders never count toward a tier.
  const selfUserIds = new Set<string>();
  const selfPhones = new Set<string>();
  for (const person of peopleResult.data ?? []) {
    selfUserIds.add(person.id as string);
    if (person.phone) selfPhones.add(normalizeWhatsAppNumber(String(person.phone)));
  }
  for (const link of linkResult.data ?? []) {
    if (link.whatsapp_number) selfPhones.add(normalizeWhatsAppNumber(String(link.whatsapp_number)));
  }
  if (store.whatsapp_number) selfPhones.add(normalizeWhatsAppNumber(store.whatsapp_number));
  selfPhones.delete("");

  // Walk the orders oldest-first; each buyer's first few count, the rest don't.
  const ordersPerBuyer = new Map<string, number>();
  const countedOrderIds = new Set<string>();
  for (const order of ordersResult.data ?? []) {
    const userId = (order.customer_user_id as string | null) ?? null;
    const phone = normalizeWhatsAppNumber(String(order.customer_whatsapp ?? ""));

    if (userId && selfUserIds.has(userId)) continue;
    if (phone && selfPhones.has(phone)) continue;

    const buyerKey = userId ? `u:${userId}` : phone ? `p:${phone}` : null;
    if (!buyerKey) continue;
    const seen = ordersPerBuyer.get(buyerKey) ?? 0;
    ordersPerBuyer.set(buyerKey, seen + 1);
    if (seen < MAX_ORDERS_PER_BUYER) countedOrderIds.add(order.id as string);
  }

  const qualifyingOrders = countedOrderIds.size;

  // Reviews count only when they came from one of those orders. That keeps
  // out self-reviews, reviews from non-buyers, and a buyer's extra reviews
  // beyond the per-buyer cap.
  const countedReviews = (linkedReviewsResult.data ?? []).filter((row) => countedOrderIds.has(row.order_id as string));
  const allRatings = countedReviews.map((row) => Number(row.rating));
  const recentRatings = countedReviews
    .filter((row) => new Date(row.created_at as string).getTime() >= sinceMs)
    .map((row) => Number(row.rating));

  const average = (values: number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  // Prefer the recent window when there are enough reviews in it.
  const ratingAvg = recentRatings.length >= MIN_RECENT_REVIEWS_FOR_WINDOW ? average(recentRatings) : average(allRatings);

  const currentTier: VerificationTier = isVerificationTier(store.verification_tier) ? store.verification_tier : "none";

  return {
    store,
    currentTier,
    metrics: {
      whatsappVerified: Boolean(store.whatsapp_verified_at),
      payoutNameMatched: payoutResult.data?.name_match_status === "matched",
      idApproved: idResult.data?.status === "approved",
      suspended: Boolean(store.verification_suspended_at),
      qualifyingOrders,
      distinctBuyers: ordersPerBuyer.size,
      reviewCount: allRatings.length,
      ratingAvg,
      storeAgeDays: Math.floor((Date.now() - new Date(store.created_at).getTime()) / DAY_MS),
      actionedReports90d: reportsResult.count ?? 0,
    },
  };
}

export type RecomputeResult = {
  storeId: string;
  previousTier: VerificationTier;
  tier: VerificationTier;
  changed: boolean;
};

export async function recomputeStoreTier(storeId: string): Promise<RecomputeResult | null> {
  const gathered = await gatherTierData(storeId);
  if (!gathered) return null;

  const { store, currentTier, metrics } = gathered;
  const evaluation = evaluateTier(metrics);
  const next = decideNextTier(currentTier, Number(store.tier_demotion_strikes ?? 0), evaluation);
  const changed = next.tier !== currentTier;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("stores")
    .update({
      verification_tier: next.tier,
      is_verified: next.tier !== "none",
      tier_demotion_strikes: next.strikes,
      ...(changed ? { verification_tier_updated_at: new Date().toISOString() } : {}),
    })
    .eq("id", storeId);

  if (error) {
    logDevError("vendor-tier.recompute", error, { storeId });
    throw new Error(error.message);
  }

  // The badge was pulled automatically (not by an admin, who sends their own
  // email): tell the vendor why. Only on the transition, so it sends once.
  if (changed && next.tier === "none" && !metrics.suspended && metrics.actionedReports90d >= REPORTS_AUTO_SUSPEND) {
    await notifyVendorOfIdDecision({
      storeId,
      decision: "suspended",
      reason:
        "Several of your product listings were reported and actioned in the last 90 days. The badge can return once those reports are more than 90 days old.",
    });
  }

  return { storeId, previousTier: currentTier, tier: next.tier, changed };
}

/** For side effects that must never break the request that triggered them. */
export async function recomputeStoreTierSafe(storeId: string): Promise<RecomputeResult | null> {
  try {
    return await recomputeStoreTier(storeId);
  } catch (error) {
    logDevError("vendor-tier.recompute-safe", error, { storeId });
    return null;
  }
}

const MAX_STORES_PER_RUN = 1000;

/** Daily sweep: every store that is, or could be, verified. */
export async function recomputeAllStoreTiers(): Promise<{
  evaluated: number;
  changed: number;
  failed: number;
  truncated: boolean;
}> {
  const supabase = createAdminSupabaseClient();

  const [approvedResult, tieredResult] = await Promise.all([
    supabase.from("vendor_verifications").select("store_id").eq("type", "id").eq("status", "approved").limit(5000),
    supabase.from("stores").select("id").neq("verification_tier", "none").limit(5000),
  ]);

  const ids = new Set<string>();
  for (const row of approvedResult.data ?? []) ids.add(row.store_id as string);
  for (const row of tieredResult.data ?? []) ids.add(row.id as string);

  const storeIds = [...ids];
  const truncated = storeIds.length > MAX_STORES_PER_RUN;

  let changed = 0;
  let failed = 0;
  let evaluated = 0;

  for (const storeId of storeIds.slice(0, MAX_STORES_PER_RUN)) {
    try {
      const result = await recomputeStoreTier(storeId);
      evaluated += 1;
      if (result?.changed) changed += 1;
    } catch {
      failed += 1;
    }
  }

  return { evaluated, changed, failed, truncated };
}

// ---- Vendor-facing progress ------------------------------------------------

export type TierRequirement = { label: string; current: string; needed: string; met: boolean };

export type TierProgress = {
  tier: VerificationTier;
  suspended: boolean;
  suspendedReason: string | null;
  autoSuspended: boolean;
  cappedByReports: boolean;
  identityComplete: boolean;
  nextTier: "trusted" | "top_seller" | null;
  requirements: TierRequirement[];
};

export async function getTierProgress(storeId: string): Promise<TierProgress | null> {
  const gathered = await gatherTierData(storeId);
  if (!gathered) return null;

  const { store, currentTier, metrics } = gathered;
  const evaluation = evaluateTier(metrics);

  const nextTier: "trusted" | "top_seller" | null =
    currentTier === "verified" ? "trusted" : currentTier === "trusted" ? "top_seller" : null;

  let requirements: TierRequirement[] = [];
  if (nextTier) {
    const t = TIER_THRESHOLDS[nextTier];
    requirements = [
      {
        label: "Buyer-confirmed orders",
        current: String(metrics.qualifyingOrders),
        needed: String(t.orders),
        met: metrics.qualifyingOrders >= t.orders,
      },
      {
        label: "Different buyers",
        current: String(metrics.distinctBuyers),
        needed: String(t.buyers),
        met: metrics.distinctBuyers >= t.buyers,
      },
      {
        label: "Reviews",
        current: String(metrics.reviewCount),
        needed: String(t.reviews),
        met: metrics.reviewCount >= t.reviews,
      },
      {
        label: "Average rating",
        current: metrics.ratingAvg > 0 ? metrics.ratingAvg.toFixed(1) : "—",
        needed: t.rating.toFixed(1),
        met: metrics.ratingAvg >= t.rating,
      },
      {
        label: "Days on Sellee",
        current: String(metrics.storeAgeDays),
        needed: String(t.storeAgeDays),
        met: metrics.storeAgeDays >= t.storeAgeDays,
      },
    ];
  }

  return {
    tier: currentTier,
    suspended: Boolean(store.verification_suspended_at),
    suspendedReason: store.verification_suspended_reason,
    autoSuspended: metrics.actionedReports90d >= REPORTS_AUTO_SUSPEND,
    cappedByReports: evaluation.cappedByReports,
    identityComplete: metrics.whatsappVerified && metrics.payoutNameMatched && metrics.idApproved,
    nextTier,
    requirements,
  };
}
