import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StoreSetupForm } from "@/components/dashboard/store-setup-form";
import { authOptions } from "@/lib/auth";
import { getUserEmailVerifiedAt, getVendorStore } from "@/lib/dashboard-data";
import { canUseAllStoreTemplates } from "@/lib/plans";
import { getEffectiveVendorId, getStaffPermissions } from "@/lib/staff";

export const metadata: Metadata = {
  title: "Storefront",
};

export default async function DashboardStorePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "staff") {
    const permissions = await getStaffPermissions(session.user.id);
    if (!permissions.store_settings) {
      redirect("/dashboard");
    }
  }

  const vendorId = getEffectiveVendorId(session);
  // Email verification is checked against the vendor's own account, not the
  // logged-in staff member's - it's a signal about the store, not the login.
  const [store, emailVerifiedAt] = vendorId
    ? await Promise.all([getVendorStore(vendorId), getUserEmailVerifiedAt(vendorId)])
    : [null, null];
  const canUseAllTemplates = vendorId ? await canUseAllStoreTemplates(vendorId) : true;

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-emerald-700">Storefront Settings</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">
          Store Setup & Template
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage profile, location, and storefront template style from one place.
        </p>
      </header>
      <StoreSetupForm
        initialStore={store}
        initialEmailVerifiedAt={emailVerifiedAt}
        canUseAllStoreTemplates={canUseAllTemplates}
      />
    </section>
  );
}
