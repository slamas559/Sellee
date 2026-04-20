import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <DashboardSidebar email={session.user.email} />
      <section className="min-w-0 flex-1 space-y-6">{children}</section>
    </main>
  );
}
