import { NextResponse } from "next/server";
import { z } from "zod";
import { resolvePaystackAccount } from "@/lib/payments/paystack";
import { getCachedBanks } from "@/lib/payout-accounts";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireVendorWorkspaceApi } from "@/lib/vendor-auth";

const resolveSchema = z.object({
  bank_code: z.string().trim().min(1).max(20),
  account_number: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits."),
});

// Preview step: shows the vendor the name the bank returns before they save.
// The save route resolves again server-side, so this response is never
// trusted as proof of anything.
export async function POST(request: Request) {
  const ctx = await requireVendorWorkspaceApi();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.isStaff) {
    return NextResponse.json({ error: "Only the store owner can manage payout details." }, { status: 403 });
  }

  // This endpoint turns an account number into a person's name, so keep it
  // from being used to look up arbitrary accounts.
  const burst = await checkRateLimit(`payout-resolve:${ctx.vendorId}`, 8, 10 * 60 * 1000);
  const daily = await checkRateLimit(`payout-resolve-day:${ctx.vendorId}`, 30, 24 * 60 * 60 * 1000);
  if (!burst.allowed || !daily.allowed) {
    const retryAfter = Math.max(burst.allowed ? 0 : burst.retryAfterSeconds, daily.allowed ? 0 : daily.retryAfterSeconds);
    return NextResponse.json(
      { error: "Too many lookups. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const banks = await getCachedBanks();
  if ("error" in banks) {
    return NextResponse.json({ error: banks.error }, { status: 502 });
  }
  if (!banks.banks.some((bank) => bank.code === parsed.data.bank_code)) {
    return NextResponse.json({ error: "Choose a bank from the list." }, { status: 400 });
  }

  const resolved = await resolvePaystackAccount({
    accountNumber: parsed.data.account_number,
    bankCode: parsed.data.bank_code,
  });
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 422 });
  }

  return NextResponse.json({ account_name: resolved.accountName });
}
