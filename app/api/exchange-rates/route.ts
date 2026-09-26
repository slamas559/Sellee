// app/api/exchange-rates/route.ts
//
// Public, read-only. Backs the customer-facing currency switcher
// (components/marketplace/currency-switcher.tsx) - never used for anything
// that affects an actual charge.

import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/exchange-rates";

export async function GET() {
  const rates = await getExchangeRates();
  return NextResponse.json({ rates });
}
