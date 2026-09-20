// lib/broadcasts/quota.ts
//
// Interim rule while monetization is disabled: every vendor gets 5
// broadcasts/month across BOTH channels combined, regardless of plan.
// This is deliberately hardcoded rather than read from plan_limits - the
// real Pro/Business quota split (7 WhatsApp / 10 combined, from the pricing
// plan discussion) is still open pending the channel-reliability question,
// and seeding plan_limits with numbers that might change again is worse
// than one clearly-marked constant to update in one place later.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const INTERIM_MONTHLY_BROADCAST_LIMIT = 10;

export interface BroadcastQuota {
  used: number;
  limit: number;
  remaining: number;
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
  const limit = INTERIM_MONTHLY_BROADCAST_LIMIT;

  return { used, limit, remaining: Math.max(0, limit - used) };
}