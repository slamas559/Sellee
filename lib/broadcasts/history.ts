// lib/broadcasts/history.ts
//
// Merges whatsapp_broadcasts and vendor_email_broadcasts into one timeline,
// since a vendor thinks in terms of "campaigns I've sent," not "which table
// is this row in." Each item is tagged with its channel(s) so the UI can
// show a WhatsApp icon, an email icon, or both (for a fallback pair).

import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export interface UnifiedBroadcastItem {
  id: string;
  channel: "whatsapp" | "email";
  status: string;
  message: string;
  subject: string | null;
  targetScope: string;
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  // Only set on an email row that was an automatic fallback for a
  // WhatsApp broadcast, not a deliberate standalone email campaign.
  fallbackForBroadcastId: string | null;
}

export async function getUnifiedBroadcastHistory(vendorId: string, limit = 30): Promise<UnifiedBroadcastItem[]> {
  const supabase = createAdminSupabaseClient();

  const [{ data: whatsappRows }, { data: emailRows }] = await Promise.all([
    supabase
      .from("whatsapp_broadcasts")
      .select("id, status, message, target_scope, scheduled_at, sent_at, sent_count, failed_count, created_at")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("vendor_email_broadcasts")
      .select(
        "id, status, subject, body, target_scope, sent_count, failed_count, created_at, completed_at, source_whatsapp_broadcast_id",
      )
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: UnifiedBroadcastItem[] = [];

  for (const row of whatsappRows ?? []) {
    items.push({
      id: row.id,
      channel: "whatsapp",
      status: row.status,
      message: row.message,
      subject: null,
      targetScope: row.target_scope,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      sentCount: row.sent_count ?? 0,
      failedCount: row.failed_count ?? 0,
      createdAt: row.created_at,
      fallbackForBroadcastId: null,
    });
  }

  for (const row of emailRows ?? []) {
    items.push({
      id: row.id,
      channel: "email",
      status: row.status === "completed" ? "sent" : row.status,
      message: row.body,
      subject: row.subject,
      targetScope: row.target_scope,
      scheduledAt: null,
      sentAt: row.completed_at,
      sentCount: row.sent_count ?? 0,
      failedCount: row.failed_count ?? 0,
      createdAt: row.created_at,
      fallbackForBroadcastId: row.source_whatsapp_broadcast_id,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}