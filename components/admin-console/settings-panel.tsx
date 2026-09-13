"use client";

import { useCallback, useEffect, useState } from "react";

interface PlanRow {
  id: string;
  key: "free" | "pro" | "business";
  name: string;
  price_monthly: number;
  is_purchasable: boolean;
}

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
      setPlans(data.plans ?? []);
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
                    ₦{plan.price_monthly.toLocaleString()}/mo
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
    </div>
  );
}