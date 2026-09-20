import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";
import { sendVendorBroadcastEmail } from "@/app/actions/emails";
import { resolveEmailBroadcastTargets, type EmailBroadcastRecipient } from "@/lib/broadcasts/email-audience";
import { storeUrl } from "@/lib/store-url";

type TargetScope = "followers" | "customers" | "all";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export async function createVendorEmailBroadcast(params: {
  vendorId: string;
  storeId: string;
  subject: string;
  body: string;
  targetScope: TargetScope;
  sourceWhatsAppBroadcastId?: string;
  explicitRecipients?: EmailBroadcastRecipient[];
}): Promise<{ broadcastId: string; recipientCount: number } | { error: string }> {
  const supabase = createAdminSupabaseClient();

  const recipients =
    params.explicitRecipients ?? (await resolveEmailBroadcastTargets(params.storeId, params.targetScope));

  const { data: broadcast, error: insertError } = await supabase
    .from("vendor_email_broadcasts")
    .insert({
      vendor_id: params.vendorId,
      store_id: params.storeId,
      subject: params.subject,
      body: params.body,
      target_scope: params.targetScope,
      source_whatsapp_broadcast_id: params.sourceWhatsAppBroadcastId ?? null,
      recipient_count: recipients.length,
    })
    .select("id")
    .single();

  if (insertError || !broadcast) {
    logDevError("vendor-email-broadcast.create", insertError, { vendorId: params.vendorId });
    return { error: "Could not create broadcast." };
  }

  if (recipients.length > 0) {
    const { error: recipientsError } = await supabase.from("vendor_email_broadcast_recipients").insert(
      recipients.map((r) => ({
        broadcast_id: broadcast.id,
        user_id: r.userId,
        email: r.email,
        full_name: r.fullName,
      })),
    );

    if (recipientsError) {
      logDevError("vendor-email-broadcast.create_recipients", recipientsError, { broadcastId: broadcast.id });
      return { error: "Could not queue recipients." };
    }
  } else {
    // No recipients at all - nothing to send, mark it done immediately
    // rather than leaving a broadcast permanently stuck in 'sending'.
    await supabase
      .from("vendor_email_broadcasts")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", broadcast.id);
  }

  return { broadcastId: broadcast.id, recipientCount: recipients.length };
}

/**
 * Sends up to `limit` still-pending recipients for a broadcast. Safe to call
 * repeatedly - the send endpoint's first batch, and again from the cron
 * runner - it only ever touches rows still marked pending.
 */
export async function processVendorEmailBroadcastBatch(
  broadcastId: string,
  limit = 25,
): Promise<{ processed: number; sent: number; failed: number; remaining: number }> {
  const supabase = createAdminSupabaseClient();

  const { data: broadcast } = await supabase
    .from("vendor_email_broadcasts")
    .select("id, subject, body, stores(name, slug, logo_url)")
    .eq("id", broadcastId)
    .maybeSingle();

  if (!broadcast) {
    return { processed: 0, sent: 0, failed: 0, remaining: 0 };
  }

  const store = Array.isArray(broadcast.stores) ? broadcast.stores[0] : broadcast.stores;
  const storeRecord = store as { name?: string; slug?: string; logo_url?: string | null } | null;
  const storeName = storeRecord?.name ?? "Your store";
  const storeLink = storeRecord?.slug ? storeUrl(storeRecord.slug) : undefined;
  const storeLogoUrl = storeRecord?.logo_url ?? null;

  const { data: recipients } = await supabase
    .from("vendor_email_broadcast_recipients")
    .select("id, email, full_name")
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending")
    .limit(limit);

  const batch = recipients ?? [];

  let sent = 0;
  let failed = 0;

  for (const recipient of batch) {
    const result = await sendVendorBroadcastEmail({
      to: recipient.email,
      storeName,
      storeLink: storeLink ?? "https://sellee.store",
      storeLogoUrl,
      subject: broadcast.subject,
      message: broadcast.body,
      recipientName: recipient.full_name,
    });

    if (result.success) {
      sent += 1;
      await supabase
        .from("vendor_email_broadcast_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", recipient.id);
    } else {
      failed += 1;
      logDevError("vendor-email-broadcast.recipient.send", result.error, { broadcastId, email: recipient.email });
      await supabase
        .from("vendor_email_broadcast_recipients")
        .update({ status: "failed", error: JSON.stringify(result.error).slice(0, 500) })
        .eq("id", recipient.id);
    }

    // Conservative pacing, matching the admin broadcast runner's cadence.
    await delay(250);
  }

  const { count: remaining } = await supabase
    .from("vendor_email_broadcast_recipients")
    .select("id", { count: "exact", head: true })
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending");

  const { data: current } = await supabase
    .from("vendor_email_broadcasts")
    .select("sent_count, failed_count")
    .eq("id", broadcastId)
    .single();

  await supabase
    .from("vendor_email_broadcasts")
    .update({
      sent_count: (current?.sent_count ?? 0) + sent,
      failed_count: (current?.failed_count ?? 0) + failed,
      ...(!remaining ? { status: "completed", completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", broadcastId);

  return { processed: batch.length, sent, failed, remaining: remaining ?? 0 };
}