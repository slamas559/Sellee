import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { StoreSetupForm } from "@/components/dashboard/store-setup-form";
import { authOptions } from "@/lib/auth";
import { getVendorStore } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Storefront",
};

export default async function DashboardStorePage() {
  const session = await getServerSession(authOptions);
  const store = session?.user?.id ? await getVendorStore(session.user.id) : null;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Storefront Settings</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">
          Store Setup & Template
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage profile, location, and storefront template style from one place.
        </p>
      </header>
      <StoreSetupForm initialStore={store} />
    </section>
  );
}
