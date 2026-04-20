import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardSidebarProps = {
  email?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export function DashboardSidebar({ email }: DashboardSidebarProps) {
  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:w-72 lg:self-start">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Sellee
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 break-all text-xs text-slate-500">{email ?? "Vendor"}</p>
      </div>

      <nav className="mt-5 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <SignOutButton />
      </div>
    </aside>
  );
}

