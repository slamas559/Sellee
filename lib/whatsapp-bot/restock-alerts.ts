import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";

type NotifyRestockParams = {
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
};

type NotifyRestockResult = {
  targetCount: number;
  sentCount: number;
  failedCount: number;
};

export async function notifyRestockSubscribers({
  storeId,
  storeName,
  productId,
  productName,
}: NotifyRestockParams): Promise<NotifyRestockResult> {
  const supabase = createAdminSupabaseClient();

  const [alertsResult, followersResult] = await Promise.all([
    supabase
      .from("restock_alerts")
      .select("id, customer_phone")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .eq("is_active", true),
    supabase
      .from("customer_store_follows")
      .select("customer_phone")
      .eq("store_id", storeId),
  ]);

  if (alertsResult.error) {
    throw new Error(alertsResult.error.message);
  }
  if (followersResult.error) {
    throw new Error(followersResult.error.message);
  }

  const alertRows =
    (alertsResult.data ?? []) as Array<{ id: string; customer_phone?: string | null }>;
  const followerRows =
    (followersResult.data ?? []) as Array<{ customer_phone?: string | null }>;

  const targets = Array.from(
    new Set(
      [...alertRows, ...followerRows]
        .map((row) => String(row.customer_phone ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 500);

  if (targets.length === 0) {
    return { targetCount: 0, sentCount: 0, failedCount: 0 };
  }

  const message = `${productName} is back in stock at ${storeName}. Check it out now on Sellee.`;
  let sentCount = 0;
  let failedCount = 0;

  for (const phone of targets) {
    try {
      await sendWhatsAppTextMessage({
        to: phone,
        message,
        command: "RESTOCK_ALERT",
        role: "system",
        scopeStoreId: storeId,
      });
      sentCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  const alertIds = alertRows.map((row) => row.id);
  if (alertIds.length > 0) {
    const { error: closeAlertsError } = await supabase
      .from("restock_alerts")
      .update({ is_active: false })
      .in("id", alertIds);

    if (closeAlertsError) {
      logDevError("whatsapp.restock.close-alerts", closeAlertsError, { productId, storeId });
    }
  }

  return { targetCount: targets.length, sentCount, failedCount };
}
