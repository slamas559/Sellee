import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorStore } from "@/lib/dashboard-data";
import { logDevError } from "@/lib/logger";
import { resolvePaystackAccount } from "@/lib/payments/paystack";
import {
  getCachedBanks,
  getStorePayoutAccount,
  toPublicPayoutAccount,
  type PayoutAccountRow,
} from "@/lib/payout-accounts";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { recomputeStoreTierSafe } from "@/lib/vendor-tier";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";

const saveSchema = z.object({
  bank_code: z.string().trim().min(1).max(20),
  account_number: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits."),
});

export async function GET() {
  const ctx = await requireVendorWorkspaceApi();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.isStaff) {
    return NextResponse.json({ error: "Only the store owner can manage payout details." }, { status: 403 });
  }

  const store = await getVendorStore(ctx.vendorId);
  if (!store) {
    return NextResponse.json({ account: null });
  }

  const row = await getStorePayoutAccount(store.id);
  return NextResponse.json({ account: row ? toPublicPayoutAccount(row) : null });
}

export async function PUT(request: Request) {
  const ctx = await requireVendorWorkspaceApi();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.isStaff) {
    return NextResponse.json({ error: "Only the store owner can manage payout details." }, { status: 403 });
  }

  const limit = checkRateLimit(`payout-save:${ctx.vendorId}`, 6, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const store = await getVendorStore(ctx.vendorId);
  if (!store) {
    return NextResponse.json({ error: "Set up your store before adding a payout account." }, { status: 400 });
  }

  // Bank name comes from Paystack's list, never from the client.
  const banks = await getCachedBanks();
  if ("error" in banks) {
    return NextResponse.json({ error: banks.error }, { status: 502 });
  }
  const bank = banks.banks.find((item) => item.code === parsed.data.bank_code);
  if (!bank) {
    return NextResponse.json({ error: "Choose a bank from the list." }, { status: 400 });
  }

  // Resolve again on the server so the saved name is always the bank's own.
  const resolved = await resolvePaystackAccount({
    accountNumber: parsed.data.account_number,
    bankCode: bank.code,
  });
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 422 });
  }

  // Re-saving the exact same account shouldn't reset its review state.
  const existing = await getStorePayoutAccount(store.id);
  if (existing && existing.bank_code === bank.code && existing.account_number === parsed.data.account_number) {
    return NextResponse.json({ account: toPublicPayoutAccount(existing) });
  }

  const now = new Date().toISOString();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("vendor_payout_accounts")
    .upsert(
      {
        store_id: store.id,
        vendor_id: ctx.vendorId,
        bank_code: bank.code,
        bank_name: bank.name,
        account_number: parsed.data.account_number,
        resolved_account_name: resolved.accountName,
        // A new or changed account always starts unreviewed.
        name_match_status: "pending",
        resolved_at: now,
        updated_at: now,
      },
      { onConflict: "store_id" },
    )
    .select("id, store_id, vendor_id, bank_code, bank_name, account_number, resolved_account_name, name_match_status, resolved_at, updated_at")
    .single();

  if (error || !data) {
    logDevError("payout-account.save", error, { storeId: store.id });
    return NextResponse.json({ error: "Could not save your payout account. Please try again." }, { status: 500 });
  }

  // A changed account is unreviewed again, so the badge must drop right away.
  await recomputeStoreTierSafe(store.id);

  return NextResponse.json({ account: toPublicPayoutAccount(data as PayoutAccountRow) });
}
