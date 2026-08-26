import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export type SellerTier = "new" | "trusted" | "top_rated";

export type VendorTrustStats = {
  ratingAvg: number;
  ratingCount: number;
  deliveredOrderCount: number;
  joinedAt: string;
  /** Human label: "Joined <date>" if under a month, "X months on Sellee"
   *  if under a year, "X years[, Y months] on Sellee" otherwise. */
  membershipLabel: string;
  tier: SellerTier;
};

/** Calendar-accurate year/month/day difference — not a fixed-days divide,
 *  which drifts on leap years and variable month lengths. */
function getCalendarDuration(joinedAt: string, now: Date): { years: number; months: number; days: number } {
  const start = new Date(joinedAt);
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

function formatMembershipLabel(joinedAt: string, now: Date = new Date()): string {
  const { years, months } = getCalendarDuration(joinedAt, now);

  if (years >= 1) {
    if (months > 0) {
      return `${years} year${years > 1 ? "s" : ""}, ${months} month${months > 1 ? "s" : ""} on Sellee`;
    }
    return `${years} year${years > 1 ? "s" : ""} on Sellee`;
  }

  if (months >= 1) {
    return `${months} month${months > 1 ? "s" : ""} on Sellee`;
  }

  const joinedDate = new Date(joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `Joined ${joinedDate}`;
}

/**
 * Tier thresholds — a rough Amazon/Jumia-style badge, not a precise
 * "grade." Tune these numbers as real data comes in; they're intentionally
 * simple (rating + order volume only) rather than a weighted score, since
 * a weighted formula is easy to get wrong on the first pass and hard for
 * a vendor to understand ("why did my grade drop by 3?").
 */
function computeTier(ratingAvg: number, ratingCount: number, deliveredOrderCount: number): SellerTier {
  if (ratingCount >= 20 && ratingAvg >= 4.5 && deliveredOrderCount >= 50) return "top_rated";
  if (ratingCount >= 5 && ratingAvg >= 3.5 && deliveredOrderCount >= 10) return "trusted";
  return "new";
}

export async function getVendorTrustStats(storeId: string): Promise<VendorTrustStats | null> {
  const supabase = createAdminSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("rating_avg, rating_count, created_at")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError || !store) return null;

  const { count: deliveredOrderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "delivered");

  const joinedAt = store.created_at as string;
  const ratingAvg = Number(store.rating_avg ?? 0);
  const ratingCount = Number(store.rating_count ?? 0);
  const deliveredCount = deliveredOrderCount ?? 0;

  return {
    ratingAvg,
    ratingCount,
    deliveredOrderCount: deliveredCount,
    joinedAt,
    membershipLabel: formatMembershipLabel(joinedAt),
    tier: computeTier(ratingAvg, ratingCount, deliveredCount),
  };
}