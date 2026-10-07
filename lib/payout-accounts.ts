// lib/payout-accounts.ts
//
// Payout (settlement) bank account for a store. The full account number is
// stored in plain text (see supabase/vendor-payout-accounts.sql) but only the
// masked form is ever sent to the browser.

import { listPaystackBanks, type PaystackBank } from "@/lib/payments/paystack";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export type NameMatchStatus = "pending" | "matched" | "mismatch";

export type PayoutAccountRow = {
  id: string;
  store_id: string;
  vendor_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  resolved_account_name: string;
  name_match_status: NameMatchStatus;
  resolved_at: string;
  updated_at: string;
};

// Safe-for-the-browser shape: no full account number.
export type PublicPayoutAccount = {
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  resolved_account_name: string;
  name_match_status: NameMatchStatus;
  updated_at: string;
};

export function maskAccountNumber(accountNumber: string): string {
  return `••••••${accountNumber.slice(-4)}`;
}

export function toPublicPayoutAccount(row: PayoutAccountRow): PublicPayoutAccount {
  return {
    bank_code: row.bank_code,
    bank_name: row.bank_name,
    account_number_masked: maskAccountNumber(row.account_number),
    resolved_account_name: row.resolved_account_name,
    name_match_status: row.name_match_status,
    updated_at: row.updated_at,
  };
}

export async function getStorePayoutAccount(storeId: string): Promise<PayoutAccountRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("vendor_payout_accounts")
    .select("id, store_id, vendor_id, bank_code, bank_name, account_number, resolved_account_name, name_match_status, resolved_at, updated_at")
    .eq("store_id", storeId)
    .maybeSingle();

  return (data as PayoutAccountRow | null) ?? null;
}

// The bank list barely changes, so cache it in-process for a day instead of
// hitting Paystack on every page load.
const BANK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const bankCache = globalThis as typeof globalThis & {
  __selleeBankCache?: { banks: PaystackBank[]; expiresAt: number };
};

export async function getCachedBanks(): Promise<{ banks: PaystackBank[] } | { error: string }> {
  const cached = bankCache.__selleeBankCache;
  if (cached && cached.expiresAt > Date.now()) {
    return { banks: cached.banks };
  }

  const result = await listPaystackBanks();
  if ("error" in result) return result;

  bankCache.__selleeBankCache = { banks: result.banks, expiresAt: Date.now() + BANK_CACHE_TTL_MS };
  return result;
}
