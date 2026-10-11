// lib/vendor-verification-notify.ts  (server only)
//
// Emails the vendor when an admin approves or rejects their ID, or when their
// badge is suspended (by an admin, or automatically after actioned reports).
// Failures are
// logged and swallowed: a flaky email provider must never undo or block a
// review decision.

import { sendVerificationDecisionEmail } from "@/lib/emails";
import { appUrl } from "@/lib/app-url";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function notifyVendorOfIdDecision(params: {
  storeId: string;
  decision: "approved" | "rejected" | "suspended";
  reason?: string | null;
  badgeLive?: boolean;
}): Promise<void> {
  try {
    const supabase = createAdminSupabaseClient();

    const { data: store } = await supabase
      .from("stores")
      .select("name, vendor_id")
      .eq("id", params.storeId)
      .maybeSingle();
    if (!store) return;

    const { data: vendor } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", store.vendor_id as string)
      .maybeSingle();
    if (!vendor?.email) return;

    const result = await sendVerificationDecisionEmail({
      to: vendor.email as string,
      name: (vendor.full_name as string | null) ?? null,
      storeName: store.name as string,
      decision: params.decision,
      reason: params.reason ?? null,
      badgeLive: params.badgeLive ?? false,
      verificationUrl: appUrl("/dashboard/verification"),
    });

    if (!result.success) {
      logDevError("verification-notify.send", result.error, { storeId: params.storeId, decision: params.decision });
    }
  } catch (error) {
    logDevError("verification-notify", error, { storeId: params.storeId, decision: params.decision });
  }
}
