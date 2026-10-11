import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Store } from "lucide-react";
import { PlanPricing } from "@/components/dashboard/plan-pricing";
import { getPricingPageData } from "@/lib/plans";
import type { BillingCycle } from "@/lib/payments/checkout";

export const metadata: Metadata = {
  title: "Plans and pricing",
  description:
    "Compare Sellee vendor plans, features, and pricing. Start selling with a free storefront or choose a plan built for your business.",
  alternates: { canonical: "/plans" },
  openGraph: {
    title: "Sellee plans and pricing",
    description: "Compare vendor plans and find the right tools for your store.",
    url: "https://sellee.store/plans",
    type: "website",
  },
};

export default async function PublicPlansPage({
  searchParams,
}: {
  searchParams?: Promise<{ billingCycle?: string }>;
}) {
  const params = await searchParams;
  const billingCycle: BillingCycle = params?.billingCycle === "yearly" ? "yearly" : "monthly";
  const { plans, monetizationEnabled } = await getPricingPageData(undefined);

  return (
    <main className="flex-1 bg-[#f7faf8]">
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              <Store className="h-3.5 w-3.5" aria-hidden="true" />
              Plans for sellers
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              The right tools for the way you sell.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Start with a storefront at no cost, then move up when your business needs more room,
              deeper insight, or extra ways to reach customers.
            </p>
            <Link
              href="/become-vendor"
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Start selling on Sellee
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-[#f8faf9] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
                <BadgeCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">Straightforward plans</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Compare the exact limits and features included before choosing. Your storefront
                  and catalog stay yours as your business grows.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Pricing</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Choose what fits your next step
            </h2>
          </div>
          <p className="text-sm text-slate-600">View monthly or annual pricing.</p>
        </div>

        {!monetizationEnabled ? (
          <p className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            All plans are currently available at no cost while Sellee gets started. Paid plans are
            shown for comparison and are not open for purchase yet.
          </p>
        ) : null}

        <div className="mt-7">
          <PlanPricing
            plans={plans}
            currentPlanKey=""
            monetizationEnabled={monetizationEnabled}
            initialBillingCycle={billingCycle}
            publicView
          />
        </div>
      </section>
    </main>
  );
}
