import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPricingPageData } from "@/lib/plans";
import { PlanCard } from "@/components/dashboard/plan-card";

export const metadata: Metadata = {
  title: "Plans",
};

export default async function DashboardPlansPage() {
  const session = await getServerSession(authOptions);
  const { plans, currentPlanKey, monetizationEnabled } = await getPricingPageData(session?.user?.id);

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Plans</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Choose your plan</h1>
        <p className="mt-1 text-sm text-slate-600">
          {monetizationEnabled
            ? "Pick the plan that matches how you sell."
            : "Sellee is free for every vendor right now. Here's what's ahead once paid plans open."}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.key === currentPlanKey}
            monetizationEnabled={monetizationEnabled}
          />
        ))}
      </div>
    </section>
  );
}
