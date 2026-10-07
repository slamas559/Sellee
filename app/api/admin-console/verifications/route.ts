import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { logDevError } from "@/lib/logger";
import { compareNames, type NameMatchLevel } from "@/lib/name-match";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import type { IdDocumentType, VerificationStatus } from "@/lib/verification-constants";
import { isVerificationTier, type VerificationTier } from "@/lib/verification-tier-constants";

type VerificationRow = {
  id: string;
  store_id: string;
  vendor_id: string;
  status: VerificationStatus;
  document_type: IdDocumentType | null;
  id_full_name: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type PayoutRow = {
  store_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  resolved_account_name: string;
  name_match_status: "pending" | "matched" | "mismatch";
};

export type VerificationQueueItem = {
  id: string;
  status: VerificationStatus;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  document_type: IdDocumentType | null;
  id_full_name: string | null;
  store: { id: string; name: string; slug: string } | null;
  vendor: { full_name: string | null; email: string } | null;
  payout: {
    bank_name: string;
    account_last4: string;
    resolved_account_name: string;
    name_match_status: "pending" | "matched" | "mismatch";
    shared_with_other_stores: number;
  } | null;
  name_hint: NameMatchLevel | null;
  badge: { tier: VerificationTier; suspended: boolean; suspended_reason: string | null } | null;
};

const VALID_STATUSES = new Set(["pending", "approved", "rejected", "all"]);

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("status") ?? "pending";
  const status = VALID_STATUSES.has(requested) ? requested : "pending";

  const supabase = createAdminSupabaseClient();

  // Oldest first for the pending queue (first come, first served), newest
  // first for everything else.
  let query = supabase
    .from("vendor_verifications")
    .select("id, store_id, vendor_id, status, document_type, id_full_name, rejection_reason, reviewed_at, created_at")
    .eq("type", "id")
    .order("created_at", { ascending: status === "pending" })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    logDevError("admin-console.verifications.list", error);
    return NextResponse.json({ error: "Could not load verifications." }, { status: 500 });
  }

  const rows = (data ?? []) as VerificationRow[];
  if (rows.length === 0) {
    return NextResponse.json({ items: [] satisfies VerificationQueueItem[] });
  }

  const storeIds = [...new Set(rows.map((row) => row.store_id))];
  const vendorIds = [...new Set(rows.map((row) => row.vendor_id))];

  const [storesResult, vendorsResult, payoutsResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, verification_tier, verification_suspended_at, verification_suspended_reason")
      .in("id", storeIds),
    supabase.from("users").select("id, full_name, email").in("id", vendorIds),
    supabase
      .from("vendor_payout_accounts")
      .select("store_id, bank_code, bank_name, account_number, resolved_account_name, name_match_status")
      .in("store_id", storeIds),
  ]);

  type StoreBadgeRow = {
    id: string;
    name: string;
    slug: string;
    verification_tier: string | null;
    verification_suspended_at: string | null;
    verification_suspended_reason: string | null;
  };
  const stores = new Map((storesResult.data ?? []).map((store) => [store.id as string, store as StoreBadgeRow]));
  const vendors = new Map(
    (vendorsResult.data ?? []).map((vendor) => [vendor.id as string, vendor as { id: string; full_name: string | null; email: string }]),
  );
  const payouts = new Map((payoutsResult.data ?? []).map((payout) => [payout.store_id as string, payout as PayoutRow]));

  // Same bank account attached to other stores: not proof of anything on its
  // own (a vendor can own several stores) but worth a look.
  const accountNumbers = [...new Set([...payouts.values()].map((payout) => payout.account_number))];
  const sharedCounts = new Map<string, number>();
  if (accountNumbers.length > 0) {
    const { data: sameAccountRows } = await supabase
      .from("vendor_payout_accounts")
      .select("store_id, bank_code, account_number")
      .in("account_number", accountNumbers);

    for (const payout of payouts.values()) {
      const others = (sameAccountRows ?? []).filter(
        (row) =>
          row.account_number === payout.account_number &&
          row.bank_code === payout.bank_code &&
          row.store_id !== payout.store_id,
      ).length;
      sharedCounts.set(payout.store_id, others);
    }
  }

  const items: VerificationQueueItem[] = rows.map((row) => {
    const store = stores.get(row.store_id) ?? null;
    const vendor = vendors.get(row.vendor_id) ?? null;
    const payout = payouts.get(row.store_id) ?? null;

    return {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      rejection_reason: row.rejection_reason,
      document_type: row.document_type,
      id_full_name: row.id_full_name,
      store: store ? { id: store.id, name: store.name, slug: store.slug } : null,
      vendor: vendor ? { full_name: vendor.full_name, email: vendor.email } : null,
      payout: payout
        ? {
            bank_name: payout.bank_name,
            account_last4: payout.account_number.slice(-4),
            resolved_account_name: payout.resolved_account_name,
            name_match_status: payout.name_match_status,
            shared_with_other_stores: sharedCounts.get(payout.store_id) ?? 0,
          }
        : null,
      name_hint: payout && row.id_full_name ? compareNames(row.id_full_name, payout.resolved_account_name) : null,
      badge: store
        ? {
            tier: isVerificationTier(store.verification_tier) ? store.verification_tier : "none",
            suspended: Boolean(store.verification_suspended_at),
            suspended_reason: store.verification_suspended_reason,
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}
