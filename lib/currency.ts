// lib/currency.ts
//
// One currency per store (not per product) - see supabase/store-currency.sql.
// This is display-only: no conversion/exchange-rate math anywhere. A price
// stored on a product is just shown with whatever symbol/locale its store's
// currency maps to here.

export type CurrencyCode = "NGN" | "GHS" | "USD" | "GBP";

export const DEFAULT_CURRENCY: CurrencyCode = "NGN";

export const SUPPORTED_CURRENCIES: Array<{
  code: CurrencyCode;
  label: string; // "Naira" - for the picker UI
  symbol: string; // "₦" - for compact display (WhatsApp bot text, etc.)
  locale: string; // for Intl.NumberFormat
}> = [
  { code: "NGN", label: "Naira", symbol: "₦", locale: "en-NG" },
  { code: "GHS", label: "Cedi", symbol: "₵", locale: "en-GH" },
  { code: "USD", label: "Dollar", symbol: "$", locale: "en-US" },
  { code: "GBP", label: "Pound", symbol: "£", locale: "en-GB" },
];

const CURRENCY_MAP: Record<CurrencyCode, (typeof SUPPORTED_CURRENCIES)[number]> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
) as Record<CurrencyCode, (typeof SUPPORTED_CURRENCIES)[number]>;

export function isSupportedCurrency(value: string | null | undefined): value is CurrencyCode {
  return !!value && value in CURRENCY_MAP;
}

export function getCurrencySymbol(code: string | null | undefined): string {
  return CURRENCY_MAP[isSupportedCurrency(code) ? code : DEFAULT_CURRENCY].symbol;
}

// The general-purpose formatter - use this everywhere a price is shown
// alongside a store/product that has (or might have) a non-Naira currency.
export function formatPrice(value: number, currencyCode?: string | null): string {
  const currency = isSupportedCurrency(currencyCode) ? currencyCode : DEFAULT_CURRENCY;
  const meta = CURRENCY_MAP[currency];

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: 0,
  }).format(value);
}
