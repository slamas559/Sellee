import type { Metadata } from "next";
import { AccountProfileForm } from "@/components/dashboard/account-profile-form";

export const metadata: Metadata = {
  title: "Account",
};

export default function DashboardAccountPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Account</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Update your display name for reviews and customer-facing touchpoints.
        </p>
      </header>
      <AccountProfileForm />
    </section>
  );
}
