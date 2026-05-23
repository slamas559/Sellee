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
        {children}
      </section>
    </main>
  );
}
