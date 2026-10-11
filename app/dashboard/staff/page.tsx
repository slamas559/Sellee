import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorPlan, isMonetizationEnabled } from "@/lib/plans";
import { listStaffAccounts } from "@/lib/staff";
import { StaffManager } from "@/components/dashboard/staff-manager";

export const metadata: Metadata = {
  title: "Staff",
};

export default async function DashboardStaffPage() {
  const session = await getServerSession(authOptions);

  // Staff management is vendor-only - a staff login should never even see
  // this page, regardless of what's checked for them elsewhere.
  if (!session?.user || session.user.role !== "vendor") {
    redirect("/dashboard");
  }

  const [staff, plan, monetizationEnabled] = await Promise.all([
    listStaffAccounts(session.user.id),
    getVendorPlan(session.user.id),
    isMonetizationEnabled(),
  ]);

  const maxStaff = plan?.limits.max_staff ?? null;
  const staffLimit = monetizationEnabled ? maxStaff : null; // null = unlimited while monetization is off

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Staff</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Staff accounts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Give people who help run your store their own login, limited to only the sections you allow.
        </p>
      </header>

      <StaffManager initialStaff={staff} staffLimit={staffLimit} />
    </section>
  );
}
