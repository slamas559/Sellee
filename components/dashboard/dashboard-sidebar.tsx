"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logoText from "@/app/logos/image-text-logo.png";
import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardSidebarProps = {
  name?: string | null;
  email?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/account", label: "Account" },
  { href: "/dashboard/store", label: "Storefront" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/integrations", label: "Integrations" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ name, email }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-3rem)] lg:self-start">
      <div className="flex h-full flex-col">
        <div>
          <Link href="/" className="inline-flex items-center">
            <Image src={logoText} alt="Sellee" className="h-9 w-auto" />
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Vendor Console</h2>
          <p className="mt-1 text-sm font-medium text-slate-700">{name ?? "Vendor"}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{email ?? ""}</p>
        </div>

        <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActivePath(pathname, item.href)
                  ? "bg-emerald-600 text-white"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

