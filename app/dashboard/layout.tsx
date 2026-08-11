import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { authOptions } from "@/lib/auth";
import { AiVendorAssistant } from "@/components/dashboard/ai-vendor-assistant";
import { getVendorStore } from "@/lib/dashboard-data";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "vendor") {
    redirect("/");
  }

  const store = await getVendorStore(session.user.id);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-24 pt-20 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:py-8">
      <DashboardMobileNav name={session.user.name} email={session.user.email} />
      <DashboardSidebar name={session.user.name} email={session.user.email} />
      <section className="min-w-0 flex-1 space-y-6">
        {store && !store.whatsapp_verified_at ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your store&apos;s WhatsApp number isn&apos;t verified yet. Shoppers won&apos;t see a Verified badge until you verify it in{" "}
            <a href="/dashboard/store" className="font-semibold underline">Store settings</a>.
          </div>
        ) : null}
        {children}
      </section>
      <AiVendorAssistant />
    </main>
  );
}
