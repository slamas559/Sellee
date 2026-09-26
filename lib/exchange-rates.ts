// lib/exchange-rates.ts
//
// Server-only. lib/currency.ts stays import-safe for client components
// (it has no Supabase/fetch dependency), so all the live-rate machinery
// lives here instead.
//
// Design: always cache rates with NGN as the base (one row in
// exchange_rates), even though a store might be priced in GHS/USD/GBP.
// Converting between any two of our four supported currencies just goes
// through NGN as an intermediate step - one cached row covers every pair,
// so there's no need for a row per base currency.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { SUPPORTED_CURRENCIES, isSupportedCurrency, type CurrencyCode } from "@/lib/currency";

const BASE: CurrencyCode = "NGN";
const FRESHNESS_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours - FX doesn't need to be live-live here

type RatesFromBase = Record<CurrencyCode, number>; // "1 NGN = rates[code] units of code"

const IDENTITY_RATES: RatesFromBase = { NGN: 1, GHS: 1, USD: 1, GBP: 1 };

async function fetchLiveRatesFromBase(): Promise<RatesFromBase | null> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    // Not configured yet - callers fall back to cached/identity rates rather
    // than throwing, so the storefront still works (just without real
    // conversion) until an admin sets this env var.
    return null;
  }

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${BASE}`, {
      // Rates change slowly enough that Next's own fetch cache plus our DB
      // cache below is redundant-but-harmless; this just avoids surprising
      // double-caching semantics.
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { result?: string; conversion_rates?: Record<string, number> };
    if (data.result !== "success" || !data.conversion_rates) return null;

    const rates: RatesFromBase = { ...IDENTITY_RATES };
    for (const c of SUPPORTED_CURRENCIES) {
      const rate = data.conversion_rates[c.code];
      if (typeof rate === "number") rates[c.code] = rate;
    }
    return rates;
  } catch {
    return null;
  }
}

// Reads the cached rates, refreshing from the live API first if the cache
// is missing or stale. Falls back to whatever's available (stale cache,
// then identity/no-conversion) rather than failing the page.
export async function getExchangeRates(): Promise<RatesFromBase> {
  const supabase = createAdminSupabaseClient();
  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("rates, updated_at")
    .eq("base_currency", BASE)
    .maybeSingle();

  const isStale = !cached || Date.now() - new Date(cached.updated_at).getTime() > FRESHNESS_WINDOW_MS;

  if (isStale) {
    const fresh = await fetchLiveRatesFromBase();
    if (fresh) {
      await supabase
        .from("exchange_rates")
        .upsert({ base_currency: BASE, rates: fresh, updated_at: new Date().toISOString() });
      return fresh;
    }
  }

  return (cached?.rates as RatesFromBase | undefined) ?? IDENTITY_RATES;
}

// amount is in `from`'s currency; returns the equivalent in `to`'s currency.
export function convertAmount(amount: number, from: string, to: string, rates: RatesFromBase): number {
  const fromCode = isSupportedCurrency(from) ? from : BASE;
  const toCode = isSupportedCurrency(to) ? to : BASE;
  if (fromCode === toCode) return amount;

  const amountInBase = amount / (rates[fromCode] || 1);
  return amountInBase * (rates[toCode] || 1);
}
