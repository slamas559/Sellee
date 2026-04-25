import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { authOptions } from "@/lib/auth";

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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-24 pt-20 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:py-8">
      <DashboardMobileNav name={session.user.name} email={session.user.email} />
      <DashboardSidebar name={session.user.name} email={session.user.email} />
      <section className="min-w-0 flex-1 space-y-6">
        <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Welcome back, {session.user.name ?? session.user.email?.split("@")[0] ?? "Vendor"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your storefront, products, and WhatsApp operations from one place.
          </p>
        </header>
        {children}
      </section>
    </main>
  );
}
