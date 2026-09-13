// lib/admin-billing.ts
//
// Deliberately separate from lib/admin-analytics.ts: that module covers
// marketplace GMV (order revenue vendors make from their customers).
// This one covers Sellee's OWN revenue — what vendors pay Sellee for their
// plan — a different metric that shouldn't be blended into "revenue" on
// the existing analytics page.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";

export interface PlanMixRow {
  planKey: string;
  planName: string;
  activeCount: number;
  mrrContribution: number;
}

export interface RecentPaymentRow {
  id: string;
  vendorEmail: string | null;
  vendorName: string | null;
  planKey: string;
  provider: string;
  amount: number;
  billingCycle: string;
  paidAt: string;
}

export interface BillingOverview {
  mrr: number;
  totalPayingVendors: number;
  planMix: PlanMixRow[];
  recentPayments: RecentPaymentRow[];
  checkoutConversion: {
    completed: number;
    failed: number;
    conversionRate: number | null; // completed / (completed + failed), last 30 days
  };
}

function one<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getBillingOverview(): Promise<BillingOverview | null> {
  const supabase = createAdminSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: activeSubs, error: activeSubsError },
    { data: recentSessions, error: recentSessionsError },
    { data: checkoutCounts, error: checkoutCountsError },
  ] = await Promise.all([
    supabase
      .from("vendor_subscriptions")
      .select("locked_monthly_price, plans(key, name)")
      .eq("status", "active")
      .not("locked_monthly_price", "is", null),
    supabase
      .from("checkout_sessions")
      .select("id, vendor_id, plan_key, provider, amount, billing_cycle, created_at, users(email, full_name)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("checkout_sessions")
      .select("status")
      .gte("created_at", thirtyDaysAgo)
      .in("status", ["completed", "failed"]),
  ]);

  if (activeSubsError || recentSessionsError || checkoutCountsError) {
    logDevError("admin-billing.overview", activeSubsError ?? recentSessionsError ?? checkoutCountsError, {});
    return null;
  }

  let mrr = 0;
  const planMixMap = new Map<string, PlanMixRow>();

  for (const row of activeSubs ?? []) {
    const plan = one(row.plans as { key: string; name: string } | { key: string; name: string }[] | null);
    if (!plan) continue;
    const price = Number(row.locked_monthly_price) || 0;
    mrr += price;

    const existing = planMixMap.get(plan.key);
    if (existing) {
      existing.activeCount += 1;
      existing.mrrContribution += price;
    } else {
      planMixMap.set(plan.key, { planKey: plan.key, planName: plan.name, activeCount: 1, mrrContribution: price });
    }
  }

  const recentPayments: RecentPaymentRow[] = (recentSessions ?? []).map((row) => {
    const user = one(row.users as { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null);
    return {
      id: row.id,
      vendorEmail: user?.email ?? null,
      vendorName: user?.full_name ?? null,
      planKey: row.plan_key,
      provider: row.provider,
      amount: Number(row.amount),
      billingCycle: row.billing_cycle,
      paidAt: row.created_at,
    };
  });

  const completed = (checkoutCounts ?? []).filter((r) => r.status === "completed").length;
  const failed = (checkoutCounts ?? []).filter((r) => r.status === "failed").length;
  const totalAttempts = completed + failed;

  return {
    mrr,
    totalPayingVendors: [...planMixMap.values()].reduce((sum, p) => sum + (p.planKey === "free" ? 0 : p.activeCount), 0),
    planMix: [...planMixMap.values()].filter((p) => p.planKey !== "free"),
    recentPayments,
    checkoutConversion: {
      completed,
      failed,
      conversionRate: totalAttempts > 0 ? (completed / totalAttempts) * 100 : null,
    },
  };
}