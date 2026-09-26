import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";
import { authOptions } from "@/lib/auth";
import { AiVendorAssistant } from "@/components/dashboard/ai-vendor-assistant";
import { getUserEmailVerifiedAt, getVendorStore } from "@/lib/dashboard-data";
import { getEffectiveVendorId, getStaffPermissions } from "@/lib/staff";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "vendor" && session.user.role !== "staff") {
    redirect("/");
  }

  const vendorId = getEffectiveVendorId(session);
  if (!vendorId) {
    // Staff row with no resolvable parent vendor (shouldn't happen given
    // the DB constraint, but fail safe rather than crash the dashboard).
    redirect("/");
  }

  const isStaff = session.user.role === "staff";
  const [store, emailVerifiedAt, staffPermissions] = await Promise.all([
    getVendorStore(vendorId),
    // Staff accounts don't need their own email-verification banner nagging
    // them about the vendor's email - only relevant for the vendor session.
    isStaff ? Promise.resolve(new Date().toISOString()) : getUserEmailVerifiedAt(session.user.id),
    isStaff ? getStaffPermissions(session.user.id) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-[#f7faf8]">
      <DashboardSidebar
        name={session.user.name}
        email={session.user.email}
        role={session.user.role}
        permissions={staffPermissions}
      />
      <div className="min-w-0 lg:pl-72">
        <DashboardTopbar name={session.user.name} store={store} />
        <DashboardMobileNav
          name={session.user.name}
          email={session.user.email}
          storeName={store?.name}
          location={[store?.city, store?.state].filter(Boolean).join(", ")}
          storeHref={store?.slug ? `/v/${store.slug}` : undefined}
          role={session.user.role as "vendor" | "staff"}
          permissions={staffPermissions}
        />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
          <section className="min-w-0 flex-1 space-y-6">
            {!emailVerifiedAt ? <EmailVerificationBanner /> : null}
            {store && !store.whatsapp_verified_at ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your store&apos;s WhatsApp number isn&apos;t verified yet. Shoppers won&apos;t see a Verified badge until you verify it in{" "}
                <a href="/dashboard/store" className="font-semibold underline">Store settings</a>.
              </div>
            ) : null}
            {children}
          </section>
        </div>
      </div>
      {!isStaff ? <AiVendorAssistant /> : null}
    </main>
  );
}
