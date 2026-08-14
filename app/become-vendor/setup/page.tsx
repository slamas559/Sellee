import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StoreSetupForm } from "@/components/dashboard/store-setup-form";
import { authOptions } from "@/lib/auth";
import { getUserEmailVerifiedAt, getVendorStore } from "@/lib/dashboard-data";

export const metadata: Metadata = { title: "Set Up Your Store" };

export default async function VendorStoreSetupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-vendor/setup");
  if (session.user.role === "vendor") redirect("/dashboard/store");

  const [store, emailVerifiedAt] = await Promise.all([
    getVendorStore(session.user.id),
    getUserEmailVerifiedAt(session.user.id),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-3 py-6 sm:px-4 sm:py-8">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Vendor setup</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Set up your store</h1>
        <p className="mt-1 text-sm text-slate-600">Complete your store profile to unlock dashboard tools and start selling on Sellee.</p>
      </header>
      <StoreSetupForm initialStore={store} initialEmailVerifiedAt={emailVerifiedAt} />
    </main>
  );
}
