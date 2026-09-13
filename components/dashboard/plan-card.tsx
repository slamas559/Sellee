import { Check } from "lucide-react";
import { formatNaira } from "@/lib/format";
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  type PlanWithDetails,
} from "@/lib/plans";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";

type PlanCardProps = {
  plan: PlanWithDetails;
  isCurrent: boolean;
  monetizationEnabled: boolean;
};

// Copy is deliberately specific per plan rather than a generic tagline —
// vague "Perfect for growing businesses" copy is the kind of filler that
// makes a pricing page read as templated rather than considered.
const PLAN_TAGLINE: Record<string, string> = {
  free: "Everything you need to start selling on WhatsApp.",
  pro: "For vendors ready to grow past word-of-mouth.",
  business: "For established sellers running serious volume.",
};

export function PlanCard({ plan, isCurrent, monetizationEnabled }: PlanCardProps) {
  const limitLines = Object.entries(plan.limits)
    .filter(([key]) => LIMIT_LABELS[key])
    .map(([key, value]) => LIMIT_LABELS[key](value));

  const featureLines = Object.entries(plan.features)
    .filter(([key, enabled]) => enabled && FEATURE_LABELS[key])
    .map(([key]) => FEATURE_LABELS[key]);

  const lines = [...limitLines, ...featureLines];

  const canUpgrade = plan.key !== "free" && !isCurrent;
  const buttonLabel = isCurrent
    ? "Your current plan"
    : monetizationEnabled && plan.isPurchasable
      ? `Switch to ${plan.name}`
      : "Coming soon";

  return (
    <article
      className={`flex flex-col rounded-lg border bg-white p-5 sm:p-6 ${
        isCurrent ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900">{plan.name}</h2>
          {isCurrent ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Current plan
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">{PLAN_TAGLINE[plan.key]}</p>
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl font-black tabular-nums text-slate-900">
          {plan.priceMonthly === 0 ? "Free" : formatNaira(plan.priceMonthly)}
        </span>
        {plan.priceMonthly > 0 ? <span className="text-sm text-slate-500">/month</span> : null}
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {canUpgrade && monetizationEnabled && plan.isPurchasable ? (
        <UpgradeButton
          planKey={plan.key as "pro" | "business"}
          planName={plan.name}
          className="mt-6 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        />
      ) : (
        <button
          type="button"
          disabled
          title={!monetizationEnabled ? "Paid plans aren't open yet — we'll announce it when they are." : undefined}
          className="mt-6 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      )}
    </article>
  );
}