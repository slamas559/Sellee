import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { IdVerificationCard } from "@/components/dashboard/id-verification-card";
import { PayoutAccountCard } from "@/components/dashboard/payout-account-card";
import { TierProgressCard } from "@/components/dashboard/tier-progress-card";
import { VerificationChecklist } from "@/components/dashboard/verification-checklist";
import { authOptions } from "@/lib/auth";
import { getVendorStore } from "@/lib/dashboard-data";
import { getStorePayoutAccount, toPublicPayoutAccount } from "@/lib/payout-accounts";
import { getTierProgress } from "@/lib/vendor-tier";
import { getLatestIdSubmission } from "@/lib/vendor-verification";

export const metadata: Metadata = {
  title: "Verification",
};

export default async function DashboardVerificationPage() {
  const session = await getServerSession(authOptions);

  // Verification and payout details belong to the store owner, not staff.
  if (!session?.user || session.user.role !== "vendor") {
    redirect("/dashboard");
  }

  const store = await getVendorStore(session.user.id);
  const [payoutRow, idSubmission, tierProgress] = store
    ? await Promise.all([getStorePayoutAccount(store.id), getLatestIdSubmission(store.id), getTierProgress(store.id)])
    : [null, null, null];
  const payoutAccount = payoutRow ? toPublicPayoutAccount(payoutRow) : null;

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Verification</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Get your store verified</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verified stores show a badge to buyers. Complete the steps below and our team will review them.
        </p>
      </header>

      {store ? (
        <>
          <VerificationChecklist
            whatsappVerified={Boolean(store.whatsapp_verified_at)}
            payoutAccount={payoutAccount}
            idSubmission={idSubmission}
          />
          {tierProgress ? <TierProgressCard progress={tierProgress} /> : null}
          <div id="payout-account" className="scroll-mt-24">
            <PayoutAccountCard initialAccount={payoutAccount} />
          </div>
          <IdVerificationCard
            submission={idSubmission}
            payoutAccountName={payoutAccount?.resolved_account_name ?? null}
          />
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:p-6">
          Set up your storefront first, then come back to complete verification.{" "}
          <Link href="/dashboard/store" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
            Go to Storefront
          </Link>
        </div>
      )}
    </section>
  );
}
