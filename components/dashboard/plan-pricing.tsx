"use client";

import { useState } from "react";
import type { BillingCycle } from "@/lib/payments/checkout";
import type { PlanWithDetails } from "@/lib/plans";
import { PlanCard } from "@/components/dashboard/plan-card";

type PlanPricingProps = {
  plans: PlanWithDetails[];
  currentPlanKey: string;
  monetizationEnabled: boolean;
  initialBillingCycle: BillingCycle;
  publicView?: boolean;
};

export function PlanPricing({
  plans,
  currentPlanKey,
  monetizationEnabled,
  initialBillingCycle,
  publicView = false,
}: PlanPricingProps) {
  const [billingCycle, setBillingCycle] = useState(initialBillingCycle);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Choose how you want to be billed.</p>
        <nav
          aria-label="Billing cycle"
          className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1"
        >
          {(["monthly", "yearly"] as const).map((cycle) => {
            const isSelected = billingCycle === cycle;
            return (
              <button
                key={cycle}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cycle === "monthly" ? "Monthly" : "Yearly"}
              </button>
            );
          })}
        </nav>
      </div>

      {publicView && billingCycle === "yearly" ? (
        <p className="text-xs text-slate-500">Yearly savings are shown on eligible plans.</p>
      ) : null}

      <div className={`grid gap-4 ${publicView ? "md:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.key === currentPlanKey}
            monetizationEnabled={monetizationEnabled}
            billingCycle={billingCycle}
            publicView={publicView}
          />
        ))}
      </div>
    </>
  );
}
