"use client";

import { useCallback, useEffect, useState } from "react";

interface PlanRow {
  id: string;
  key: "free" | "pro" | "business";
  name: string;
  price_monthly: string;
  price_yearly: string;
  is_purchasable: boolean;
  limits: {
    max_products: number | null;
    max_staff: number | null;
    broadcast_per_month: number | null;
  };
  features: {
    advanced_analytics: boolean;
    exportable_reports: boolean;
    promo_pricing: boolean;
    priority_search_placement: boolean;
    featured_homepage_boost: boolean;
  };
}

const LIMIT_FIELDS: Array<{
  key: keyof PlanRow["limits"];
  label: string;
}> = [
  { key: "max_products", label: "Products" },
  { key: "max_staff", label: "Staff accounts" },
  { key: "broadcast_per_month", label: "Broadcasts per month" },
];

const FEATURE_FIELDS: Array<{
  key: keyof PlanRow["features"];
  label: string;
}> = [
  { key: "advanced_analytics", label: "Advanced analytics" },
  { key: "exportable_reports", label: "Exportable reports" },
  { key: "promo_pricing", label: "Promo / compare-at pricing" },
  { key: "priority_search_placement", label: "Priority search placement" },
  { key: "featured_homepage_boost", label: "Featured homepage boost" },
];

// Self-contained toggle switch — there's no .atlas-toggle in atlas.css yet,
// so this is built from the same tokens (ink/brass/line) rather than a
// generic Tailwind switch, to stay inside the console's own visual system.
function AtlasToggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      style={{ background: checked ? "var(--atlas-brass)" : "var(--atlas-line)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(1.5px)" : "translateX(-20px)" }}
      />
    </button>
  );
}

export function SettingsPanel() {
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin-console/settings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load settings.");
      setMonetizationEnabled(data.monetizationEnabled ?? false);
      setPlans(
        (data.plans ?? []).map((plan: PlanRow) => ({
          ...plan,
          price_monthly: String(plan.price_monthly),
          price_yearly: String(plan.price_yearly),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleMonetization() {
    const next = !monetizationEnabled;
    setSavingKey("monetization_enabled");
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin-console/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monetizationEnabled: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update.");
      setMonetizationEnabled(next);
      setNotice(next ? "Monetization is now live." : "Monetization is off — all plans read as free.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setSavingKey(null);
    }
  }

  async function togglePlanPurchasable(plan: PlanRow) {
    const next = !plan.is_purchasable;
    setSavingKey(plan.key);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin-console/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planPurchasable: { planKey: plan.key, isPurchasable: next } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update.");
      setPlans((prev) => prev.map((p) => (p.key === plan.key ? { ...p, is_purchasable: next } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setSavingKey(null);
    }
  }

  async function savePlanPricing(plan: PlanRow) {
    setSavingKey(`${plan.key}-pricing`);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin-console/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planPricing: {
            planKey: plan.key,
            priceMonthly: Number(plan.price_monthly),
            priceYearly: Number(plan.price_yearly),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save plan prices.");
      setNotice(`${plan.name} plan prices saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan prices.");
    } finally {
      setSavingKey(null);
    }
  }

  async function savePlanSettings(plan: PlanRow) {
    setSavingKey(`${plan.key}-settings`);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/admin-console/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSettings: {
            planKey: plan.key,
            limits: plan.limits,
            features: plan.features,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save plan settings.");
      setNotice(`${plan.name} plan settings saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan settings.");
    } finally {
      setSavingKey(null);
    }
  }

  function updatePlanLimit(
    planKey: PlanRow["key"],
    limitKey: keyof PlanRow["limits"],
    value: string,
  ) {
    const limit = value === "" ? null : Number(value);
    setPlans((current) =>
      current.map((plan) =>
        plan.key === planKey
          ? { ...plan, limits: { ...plan.limits, [limitKey]: limit } }
          : plan,
      ),
    );
  }

  function togglePlanFeature(
    planKey: PlanRow["key"],
    featureKey: keyof PlanRow["features"],
  ) {
    setPlans((current) =>
      current.map((plan) =>
        plan.key === planKey
          ? {
              ...plan,
              features: {
                ...plan.features,
                [featureKey]: !plan.features[featureKey],
              },
            }
          : plan,
      ),
    );
  }

  if (isLoading) {
    return <div className="atlas-panel p-4 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>Loading settings…</div>;
  }

  const paidPlans = plans.filter((p) => p.key !== "free");

  return (
    <div className="space-y-4">
      {error ? (
        <div className="atlas-panel p-3 text-[13px]" style={{ color: "var(--atlas-danger)", background: "var(--atlas-danger-bg)", borderColor: "var(--atlas-danger)" }}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="atlas-panel p-3 text-[13px]" style={{ color: "var(--atlas-signal)", background: "var(--atlas-signal-bg)" }}>
          {notice}
        </div>
      ) : null}

      <div className="atlas-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold">Monetization</p>
            <p className="mt-1 max-w-md text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
              Global switch for the vendor pricing page. While off, every vendor sees plans as informational only —
              upgrade buttons show &quot;Coming soon&quot; regardless of individual plan settings below.
            </p>
            <span
              className="atlas-badge mt-3"
              data-tone={monetizationEnabled ? "active" : "neutral"}
            >
              {monetizationEnabled ? "Live" : "Off"}
            </span>
          </div>
          <AtlasToggle
            checked={monetizationEnabled}
            onChange={toggleMonetization}
            disabled={savingKey === "monetization_enabled"}
            label="Toggle monetization"
          />
        </div>
      </div>

      <div className="atlas-panel overflow-hidden">
        <div className="border-b p-4" style={{ borderColor: "var(--atlas-line)" }}>
          <p className="text-[14px] font-semibold">Paid plans</p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            Per-plan availability. A plan only takes payment when it&apos;s marked purchasable <em>and</em>{" "}
            monetization is live above — both need to be on.
          </p>
        </div>
        <table className="w-full text-left text-[13px]">
          <tbody>
            {paidPlans.map((plan) => (
              <tr key={plan.id} className="border-b last:border-b-0" style={{ borderColor: "var(--atlas-line)" }}>
                <td className="p-4">
                  <p className="font-medium">{plan.name}</p>
                  <p className="atlas-figure mt-0.5 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                    ₦{Number(plan.price_monthly).toLocaleString()}/mo · ₦{Number(plan.price_yearly).toLocaleString()}/yr
                  </p>
                </td>
                <td className="p-4">
                  <span className="atlas-badge" data-tone={plan.is_purchasable ? "active" : "neutral"}>
                    {plan.is_purchasable ? "Purchasable" : "Hidden"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <AtlasToggle
                    checked={plan.is_purchasable}
                    onChange={() => togglePlanPurchasable(plan)}
                    disabled={savingKey === plan.key}
                    label={`Toggle ${plan.name} purchasable`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3" aria-labelledby="plan-entitlements-heading">
        <div>
          <p id="plan-entitlements-heading" className="text-[14px] font-semibold">
            Plan limits and features
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            Set resource limits and enable or disable each plan feature. Leave a limit blank for unlimited.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="atlas-panel space-y-5 p-5">
              <div>
                <p className="text-[14px] font-semibold">{plan.name}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                  Configure entitlements available to vendors on this plan.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide">Pricing (NGN)</p>
                <label className="flex items-center justify-between gap-3 text-[13px]">
                  <span>Monthly price</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    aria-label={`${plan.name} monthly price`}
                    value={plan.price_monthly}
                    onChange={(event) => {
                      const price = event.target.value;
                      setPlans((current) =>
                        current.map((item) =>
                          item.key === plan.key ? { ...item, price_monthly: price } : item,
                        ),
                      );
                    }}
                    className="w-32 rounded-md border px-2.5 py-1.5 text-right"
                    style={{
                      borderColor: "var(--atlas-line)",
                      background: "var(--atlas-paper-raised)",
                    }}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-[13px]">
                  <span>Yearly price</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    aria-label={`${plan.name} yearly price`}
                    value={plan.price_yearly}
                    onChange={(event) => {
                      const price = event.target.value;
                      setPlans((current) =>
                        current.map((item) =>
                          item.key === plan.key ? { ...item, price_yearly: price } : item,
                        ),
                      );
                    }}
                    className="w-32 rounded-md border px-2.5 py-1.5 text-right"
                    style={{
                      borderColor: "var(--atlas-line)",
                      background: "var(--atlas-paper-raised)",
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => savePlanPricing(plan)}
                  disabled={savingKey === `${plan.key}-pricing`}
                  className="w-full rounded-md border px-3 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: "var(--atlas-line)",
                    color: "var(--atlas-ink)",
                  }}
                >
                  {savingKey === `${plan.key}-pricing` ? "Saving…" : `Save ${plan.name} prices`}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide">Limits</p>
                {LIMIT_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-[13px]">
                    <span>{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      aria-label={`${plan.name} ${label} limit`}
                      value={plan.limits[key] ?? ""}
                      onChange={(event) => updatePlanLimit(plan.key, key, event.target.value)}
                      className="w-28 rounded-md border px-2.5 py-1.5 text-right"
                      style={{
                        borderColor: "var(--atlas-line)",
                        background: "var(--atlas-paper-raised)",
                      }}
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide">Features</p>
                {FEATURE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3 text-[13px]">
                    <span>{label}</span>
                    <AtlasToggle
                      checked={plan.features[key]}
                      onChange={() => togglePlanFeature(plan.key, key)}
                      disabled={savingKey === `${plan.key}-settings`}
                      label={`${plan.name}: ${label}`}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => savePlanSettings(plan)}
                disabled={savingKey === `${plan.key}-settings`}
                className="w-full rounded-md px-3 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--atlas-ink)" }}
              >
                {savingKey === `${plan.key}-settings` ? "Saving…" : `Save ${plan.name} settings`}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}