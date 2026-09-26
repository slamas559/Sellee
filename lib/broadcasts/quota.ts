// lib/broadcasts/quota.ts
//
// Broadcast quota is now plan-aware:
// - If monetization is OFF (app_config.monetization_enabled = false), every
//   vendor gets unlimited broadcasts, full stop - "everything free while
//   we're starting out" applies here same as any other gated feature.
// - If monetization is ON, the quota comes from the vendor's actual plan
//   (plan_limits.broadcast_per_month for their current plan): Free = 0,
//   Pro = 1, Business = 3.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { getVendorPlan, isMonetizationEnabled } from "@/lib/plans";

export interface BroadcastQuota {
  used: number;
  limit: number; // Infinity when unlimited - see `unlimited` before formatting for display
  remaining: number;
  unlimited: boolean;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getMonthlyBroadcastUsage(vendorId: string): Promise<BroadcastQuota> {
  const supabase = createAdminSupabaseClient();
  const since = startOfCurrentMonthIso();

  const [{ count: whatsappCount }, { count: emailCount }] = await Promise.all([
    supabase
      .from("whatsapp_broadcasts")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .gte("created_at", since),
    // Fallback emails (source_whatsapp_broadcast_id set) don't count
    // separately - from the vendor's perspective, sending to "both
    // channels" is one broadcast action, not two. Only a deliberate
    // email-only send counts as its own use of the monthly allowance.
    supabase
      .from("vendor_email_broadcasts")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .is("source_whatsapp_broadcast_id", null)
      .gte("created_at", since),
  ]);

  const used = (whatsappCount ?? 0) + (emailCount ?? 0);

  const monetizationEnabled = await isMonetizationEnabled();
  if (!monetizationEnabled) {
    return { used, limit: Infinity, remaining: Infinity, unlimited: true };
  }

  const plan = await getVendorPlan(vendorId);
  // No plan row found (shouldn't happen post-backfill) - fail closed at 0
  // remaining rather than throwing, matching withinLimit's fail-closed intent.
  const rawLimit = plan?.limits.broadcast_per_month;
  if (rawLimit === null) {
    // null in plan_limits means unlimited for that plan
    return { used, limit: Infinity, remaining: Infinity, unlimited: true };
  }
  const limit = rawLimit ?? 0;

  return { used, limit, remaining: Math.max(0, limit - used), unlimited: false };
}