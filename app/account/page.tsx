import type { Metadata } from "next";
 
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AccountProfileForm } from "@/components/dashboard/account-profile-form";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account",
};

type AccountSearchParams = Promise<{
  status?: string;
  q?: string;
  onboarding?: string;
}>;

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: AccountSearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const params = await searchParams;
  const selectedStatus = (params.status ?? "all").toLowerCase();
  const orderRefQuery = (params.q ?? "").trim().toUpperCase();
  const showOnboardingPrompt = params.onboarding === "google";

  // follow data now moved to its own page; keep profile only on account page

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-3 py-6 sm:px-4 sm:py-8">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Profile & Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your personal details, WhatsApp ordering contact, and role settings.
        </p>
        {showOnboardingPrompt ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Google sign-in successful. Complete your WhatsApp number verification below to finish account setup.
          </p>
        ) : null}
      </header>
      <AccountProfileForm />
    </main>
  );
}
