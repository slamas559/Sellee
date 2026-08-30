import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";
import { sendAdminBroadcastEmail } from "@/app/actions/emails";

export type BroadcastSegment = "all_customers" | "all_vendors" | "verified_vendors" | "niche";

export interface BroadcastRecipient {
  user_id: string;
  email: string;
  full_name: string | null;
}

/**
 * Resolves a segment (+ optional niche) into the concrete list of accounts
 * it targets. Only active accounts are ever included - suspended vendors
 * and customers don't receive broadcasts.
 */
export async function resolveAudience(
  segment: BroadcastSegment,
  nicheId?: string | null,
): Promise<BroadcastRecipient[]> {
  const supabase = createAdminSupabaseClient();

  if (segment === "all_customers") {
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("role", "customer")
      .eq("status", "active");
    return (data ?? []).map((u) => ({ user_id: u.id, email: u.email, full_name: u.full_name }));
  }

  if (segment === "all_vendors") {
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("role", "vendor")
      .eq("status", "active");
    return (data ?? []).map((u) => ({ user_id: u.id, email: u.email, full_name: u.full_name }));
  }

  if (segment === "verified_vendors") {
    const { data: stores } = await supabase.from("stores").select("vendor_id").eq("is_verified", true);
    const vendorIds = [...new Set((stores ?? []).map((s) => s.vendor_id))];
    if (vendorIds.length === 0) return [];

    const { data } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("role", "vendor")
      .eq("status", "active")
      .in("id", vendorIds);
    return (data ?? []).map((u) => ({ user_id: u.id, email: u.email, full_name: u.full_name }));
  }

  if (segment === "niche") {
    if (!nicheId) return [];
    const { data: storeNiches } = await supabase
      .from("store_niches")
      .select("store_id")
      .eq("niche_id", nicheId);
    const storeIds = [...new Set((storeNiches ?? []).map((s) => s.store_id))];
    if (storeIds.length === 0) return [];

    const { data: stores } = await supabase.from("stores").select("vendor_id").in("id", storeIds);
    const vendorIds = [...new Set((stores ?? []).map((s) => s.vendor_id))];
    if (vendorIds.length === 0) return [];

    const { data } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("role", "vendor")
      .eq("status", "active")
      .in("id", vendorIds);
    return (data ?? []).map((u) => ({ user_id: u.id, email: u.email, full_name: u.full_name }));
  }

  return [];
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Small delay between sends so a batch doesn't burst past Resend's rate limit. */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends up to `limit` still-pending recipients for a broadcast, updating
 * each recipient row and the broadcast's running counts as it goes.
 * Marks the broadcast completed once no pending recipients remain.
 * Safe to call repeatedly (from the send endpoint's first batch, and again
 * from the cron runner) - it only ever touches rows still marked pending.
 */
export async function processBroadcastBatch(
  broadcastId: string,
  limit = 25,
): Promise<{ processed: number; sent: number; failed: number; remaining: number }> {
  const supabase = createAdminSupabaseClient();

  const { data: broadcast } = await supabase
    .from("email_broadcasts")
    .select("id, subject, body")
    .eq("id", broadcastId)
    .maybeSingle();

  if (!broadcast) {
    return { processed: 0, sent: 0, failed: 0, remaining: 0 };
  }

  const { data: recipients } = await supabase
    .from("email_broadcast_recipients")
    .select("id, email, full_name")
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending")
    .limit(limit);

  const batch = recipients ?? [];
  const paragraphs = splitParagraphs(broadcast.body);

  let sent = 0;
  let failed = 0;

  for (const recipient of batch) {
    const personalized = paragraphs.map((p) =>
      p.replace(/\{\{\s*name\s*\}\}/gi, recipient.full_name?.trim() || "there"),
    );

    const result = await sendAdminBroadcastEmail({
      to: recipient.email,
      subject: broadcast.subject,
      paragraphs: personalized,
      recipientName: recipient.full_name,
    });

    if (result.success) {
      sent += 1;
      await supabase
        .from("email_broadcast_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", recipient.id);
    } else {
      failed += 1;
      logDevError("email-broadcast.recipient.send", result.error, { broadcastId, email: recipient.email });
      await supabase
        .from("email_broadcast_recipients")
        .update({ status: "failed", error: JSON.stringify(result.error).slice(0, 500) })
        .eq("id", recipient.id);
    }

    // Conservative pacing - well under any reasonable per-second cap.
    await delay(250);
  }

  const { count: remaining } = await supabase
    .from("email_broadcast_recipients")
    .select("id", { count: "exact", head: true })
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending");

  const { data: current } = await supabase
    .from("email_broadcasts")
    .select("sent_count, failed_count")
    .eq("id", broadcastId)
    .single();

  await supabase
    .from("email_broadcasts")
    .update({
      sent_count: (current?.sent_count ?? 0) + sent,
      failed_count: (current?.failed_count ?? 0) + failed,
      ...(!remaining ? { status: "completed", completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", broadcastId);

  return { processed: batch.length, sent, failed, remaining: remaining ?? 0 };
}