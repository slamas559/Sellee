"use client";

import { useState } from "react";

type Provider = "paystack" | "flutterwave";

export function UpgradeButton({
  planKey,
  planName,
  className,
}: {
  planKey: "pro" | "business";
  planName: string;
  className: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  async function startCheckout(provider: Provider) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billingCycle: "monthly", provider }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setIsLoading(false);
    }
  }

  if (showProviderPicker) {
    return (
      <div className="mt-6 space-y-2">
        <p className="text-xs text-slate-500">Pay with:</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => startCheckout("paystack")}
            className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Paystack
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => startCheckout("flutterwave")}
            className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Flutterwave
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setShowProviderPicker(true)} className={className}>
        {`Switch to ${planName}`}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </>
  );
}