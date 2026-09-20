// lib/broadcasts/stats.ts
//
// Deliberately narrower than getVendorOutboundBotTrends() in
// lib/dashboard-data.ts, which covers ALL outbound WhatsApp traffic (order
// confirmations, review requests, broadcasts, everything) - that one stays
// in Integrations since it's a general bot-health view, not broadcast-
// specific. This pulls the same underlying log table but filtered to only
// command = 'BROADCAST', for a number that actually answers "how are my
// broadcasts doing" on the broadcasts page itself.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export interface BroadcastSendStats {
  last7Days: {
    sent: number;
    failed: number;
  };
}

export async function getBroadcastSendStats(storeId: string): Promise<BroadcastSendStats> {
  const supabase = createAdminSupabaseClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("whatsapp_message_logs")
    .select("status")
    .eq("direction", "outbound")
    .eq("command", "BROADCAST")
    .gte("created_at", sevenDaysAgo)
    .filter("provider_payload->>scope_store_id", "eq", storeId)
    .limit(2000);

  if (error || !data) {
    return { last7Days: { sent: 0, failed: 0 } };
  }

  const sent = data.filter((row) => row.status === "ok").length;
  const failed = data.filter((row) => row.status === "error").length;

  return { last7Days: { sent, failed } };
}