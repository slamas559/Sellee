"use client";

// components/marketplace/currency-switcher.tsx
//
// Lets a customer switch what currency PRICES ARE DISPLAYED IN on a single
// store's pages, if that vendor has activated any alternate currencies.
// This never changes what's actually charged - the real, authorized
// currency (store.currency) is always what's sent to WhatsApp/checkout.
// See supabase/store-currency-conversion.sql for the model.

import { useState, useEffect, createContext, useContext } from "react";
import { SUPPORTED_CURRENCIES, formatPrice } from "@/lib/currency";

type DisplayCurrencyContextValue = {
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  rates: Record<string, number> | null; // "1 NGN = rates[code] units of code"
  authorizedCurrency: string;
};

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

// Wrap a store's pages with this. Fetches rates lazily (only if the vendor
// actually activated any alternate currencies - no point calling the rates
// endpoint for a store that only supports its own currency).
export function DisplayCurrencyProvider({
  authorizedCurrency,
  activatedCurrencies,
  children,
}: {
  authorizedCurrency: string;
  activatedCurrencies: string[];
  children: React.ReactNode;
}) {
  const [displayCurrency, setDisplayCurrency] = useState(authorizedCurrency);
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (activatedCurrencies.length === 0) return;
    fetch("/api/exchange-rates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rates?: Record<string, number> } | null) => {
        if (data?.rates) setRates(data.rates);
      })
      .catch(() => {});
  }, [activatedCurrencies.length]);

  return (
    <DisplayCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, rates, authorizedCurrency }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  // Falls back to "no conversion, no switcher" if a page renders outside the
  // provider - callers just see prices in whatever currency they pass in.
  return (
    ctx ?? {
      displayCurrency: "NGN",
      setDisplayCurrency: () => {},
      rates: null,
      authorizedCurrency: "NGN",
    }
  );
}

// Converts amount (in itemCurrency - typically a product's own store
// currency) to the customer's currently-selected display currency, IF
// itemCurrency matches the currency the active provider was set up for
// (i.e. this item belongs to the store whose switcher is showing). Safe to
// call with no provider at all, or for an item from a DIFFERENT store than
// the page's main one (e.g. a cross-store "related products" card) - in
// both cases it just falls back to showing the item's own real currency,
// unconverted.
export function useConvertedPrice(amount: number, itemCurrency: string): { formatted: string; isEstimate: boolean } {
  const ctx = useContext(DisplayCurrencyContext);

  if (!ctx || ctx.authorizedCurrency !== itemCurrency || ctx.displayCurrency === itemCurrency || !ctx.rates) {
    return { formatted: formatPrice(amount, itemCurrency), isEstimate: false };
  }

  const amountInBase = amount / (ctx.rates[itemCurrency] || 1);
  const converted = amountInBase * (ctx.rates[ctx.displayCurrency] || 1);
  return { formatted: formatPrice(converted, ctx.displayCurrency), isEstimate: true };
}

// Drop-in replacement for a plain formatPrice() call in server component JSX
// - lets a server component show a converted price without itself needing
// to be a client component or call the hook directly.
export function ProductPriceDisplay({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const { formatted, isEstimate } = useConvertedPrice(amount, currency);
  return (
    <span className={className}>
      {formatted}
      {isEstimate ? <span className="ml-1 text-xs font-normal opacity-75">est.</span> : null}
    </span>
  );
}

// The visible dropdown - only render this where the vendor has activated at
// least one alternate currency (check activatedCurrencies.length first).
export function CurrencySwitcher({ activatedCurrencies }: { activatedCurrencies: string[] }) {
  const { displayCurrency, setDisplayCurrency, authorizedCurrency } = useDisplayCurrency();

  if (activatedCurrencies.length === 0) return null;

  const options = [authorizedCurrency, ...activatedCurrencies];

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span>View prices in</span>
      <select
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium outline-none"
      >
        {options.map((code) => {
          const meta = SUPPORTED_CURRENCIES.find((c) => c.code === code);
          return (
            <option key={code} value={code}>
              {meta?.symbol} {code}
              {code === authorizedCurrency ? "" : " (est.)"}
            </option>
          );
        })}
      </select>
    </label>
  );
}
