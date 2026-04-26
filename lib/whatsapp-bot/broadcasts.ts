import { logDevError, logServerInfo } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";

type TargetScope = "followers" | "customers" | "all";

type CreateBroadcastParams = {
  vendorId: string;
  storeId: string;
  message: string;
  targetScope?: TargetScope;
};

type ScheduleBroadcastParams = CreateBroadcastParams & {
  scheduledAt: string;
};

type ExecuteCreatedBroadcastParams = CreateBroadcastParams & {
  broadcastId: string;
};

export type BroadcastExecutionResult = {
  broadcastId: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  status: "sent" | "failed";
};

export type ScheduledBroadcastRunSummary = {
  dueCount: number;
  processedCount: number;
  sentCount: number;
  failedCount: number;
};

type BroadcastRow = {
  id: string;
  vendor_id: string;
  store_id: string;
  message: string;
  target_scope: TargetScope;
};

async function getStoreName(storeId: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return String(data?.name ?? "Store");
}

async function resolveBroadcastTargets(
  storeId: string,
  targetScope: TargetScope,
): Promise<string[]> {
  const supabase = createAdminSupabaseClient();
  const phoneSet = new Set<string>();

  if (targetScope === "followers" || targetScope === "all") {
    const { data, error } = await supabase
      .from("customer_store_follows")
      .select("customer_phone")
      .eq("store_id", storeId);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as Array<{ customer_phone?: string | null }>) {
      const phone = String(row.customer_phone ?? "").trim();
      if (phone) {
        phoneSet.add(phone);
      }
    }
  }

  if (targetScope === "customers" || targetScope === "all") {
    const { data, error } = await supabase
      .from("orders")
      .select("customer_whatsapp")
      .eq("store_id", storeId)
      .not("customer_whatsapp", "is", null)
      .neq("customer_whatsapp", "unknown")
      .limit(1000);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as Array<{ customer_whatsapp?: string | null }>) {
      const phone = String(row.customer_whatsapp ?? "").trim();
      if (phone) {
        phoneSet.add(phone);
      }
    }
  }

  return Array.from(phoneSet).slice(0, 1000);
}

async function executeExistingBroadcast(
  params: ExecuteCreatedBroadcastParams,
): Promise<BroadcastExecutionResult> {
  const { broadcastId, storeId, message, targetScope } = params;
  const supabase = createAdminSupabaseClient();
  const storeName = await getStoreName(storeId);
  const targets = await resolveBroadcastTargets(storeId, targetScope ?? "followers");

  if (targets.length === 0) {
    const { error: updateError } = await supabase
      .from("whatsapp_broadcasts")
      .update({
        status: "failed",
        sent_at: new Date().toISOString(),
        sent_count: 0,
        failed_count: 0,
      })
      .eq("id", broadcastId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      broadcastId,
      targetCount: 0,
      sentCount: 0,
      failedCount: 0,
      status: "failed",
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  const outboundMessage = `Broadcast from ${storeName}:\n${message}`;

  for (const to of targets) {
    try {
      await sendWhatsAppTextMessage({
        to,
        message: outboundMessage,
        command: "BROADCAST",
        role: "vendor",
        scopeStoreId: storeId,
      });
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      logDevError("whatsapp.broadcast.send", error, { broadcastId, to });
    }
  }

  const status: "sent" | "failed" = sentCount > 0 ? "sent" : "failed";
  const { error: finalUpdateError } = await supabase
    .from("whatsapp_broadcasts")
    .update({
      status,
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", broadcastId);

  if (finalUpdateError) {
    throw new Error(finalUpdateError.message);
  }

  return {
    broadcastId,
    targetCount: targets.length,
    sentCount,
    failedCount,
    status,
  };
}

export async function executeBroadcastNow(
  params: CreateBroadcastParams,
): Promise<BroadcastExecutionResult> {
  const { vendorId, storeId, message, targetScope = "followers" } = params;
  const supabase = createAdminSupabaseClient();

  const { data: broadcastRow, error: insertError } = await supabase
    .from("whatsapp_broadcasts")
    .insert({
      vendor_id: vendorId,
      store_id: storeId,
      message,
      status: "sending",
      target_scope: targetScope,
    })
    .select("id")
    .single();

  if (insertError || !broadcastRow?.id) {
    throw new Error(insertError?.message ?? "Failed to create broadcast record.");
  }

  return executeExistingBroadcast({
    broadcastId: String(broadcastRow.id),
    vendorId,
    storeId,
    message,
    targetScope,
  });
}

export async function scheduleBroadcast(
  params: ScheduleBroadcastParams,
): Promise<{ broadcastId: string; scheduledAt: string }> {
  const { vendorId, storeId, message, scheduledAt, targetScope = "followers" } = params;
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .insert({
      vendor_id: vendorId,
      store_id: storeId,
      message,
      status: "scheduled",
      target_scope: targetScope,
      scheduled_at: scheduledAt,
    })
    .select("id, scheduled_at")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Failed to schedule broadcast.");
  }

  return {
    broadcastId: String(data.id),
    scheduledAt: String(data.scheduled_at),
  };
}

async function claimScheduledBroadcast(
  row: BroadcastRow,
): Promise<BroadcastRow | null> {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .update({
      status: "sending",
      sent_count: 0,
      failed_count: 0,
      sent_at: null,
    })
    .eq("id", row.id)
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .select("id, vendor_id, store_id, message, target_scope")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    vendor_id: String(data.vendor_id),
    store_id: String(data.store_id),
    message: String(data.message),
    target_scope: data.target_scope as TargetScope,
  };
}

export async function runDueScheduledBroadcasts(
  limit = 20,
): Promise<ScheduledBroadcastRunSummary> {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .select("id, vendor_id, store_id, message, target_scope")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error) {
    throw new Error(error.message);
  }

  const dueRows = (data ?? []) as BroadcastRow[];
  let processedCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  for (const row of dueRows) {
    let claimed: BroadcastRow | null = null;

    try {
      claimed = await claimScheduledBroadcast(row);
      if (!claimed) {
        continue;
      }

      const result = await executeExistingBroadcast({
        broadcastId: claimed.id,
        vendorId: claimed.vendor_id,
        storeId: claimed.store_id,
        message: claimed.message,
        targetScope: claimed.target_scope,
      });

      processedCount += 1;
      sentCount += result.sentCount;
      failedCount += result.failedCount;
    } catch (error) {
      processedCount += 1;
      failedCount += 1;

      if (claimed?.id) {
        await supabase
          .from("whatsapp_broadcasts")
          .update({
            status: "failed",
            sent_at: new Date().toISOString(),
          })
          .eq("id", claimed.id);
      }

      logDevError("whatsapp.broadcast.scheduler.execute", error, {
        broadcastId: claimed?.id ?? row.id,
      });
    }
  }

  logServerInfo("whatsapp.broadcast.scheduler.summary", {
    dueCount: dueRows.length,
    processedCount,
    sentCount,
    failedCount,
  });

  return {
    dueCount: dueRows.length,
    processedCount,
    sentCount,
    failedCount,
  };
}
