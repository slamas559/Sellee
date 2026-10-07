// lib/vendor-verification.ts  (server only)

import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { IdSubmissionPublic } from "@/lib/verification-constants";

export async function getLatestIdSubmission(storeId: string): Promise<IdSubmissionPublic | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("vendor_verifications")
    .select("id, status, document_type, id_full_name, rejection_reason, created_at, reviewed_at")
    .eq("store_id", storeId)
    .eq("type", "id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as IdSubmissionPublic | null) ?? null;
}
