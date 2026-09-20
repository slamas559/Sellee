"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Package,
  PlugZap,
  Store,
  UserRound,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import logoText from "@/app/logos/image-text-logo.png";
import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardSidebarProps = {
  name?: string | null;
  email?: string | null;
};

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/dashboard/store", label: "Storefront", icon: Store },
  { href: "/dashboard/integrations", label: "Integrations", icon: PlugZap },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/dashboard/plans", label: "Plans", icon: CreditCard },
  { href: "/dashboard/account", label: "Account", icon: UserRound },
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
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 border-r border-slate-200/80 bg-white lg:block">
      <div className="flex h-full flex-col p-5">
        <div className="border-b border-slate-100 pb-5">
          <Link href="/" className="inline-flex items-center rounded-lg px-1 py-1 transition hover:bg-slate-50">
            <Image src={logoText} alt="Sellee" className="h-9 w-auto" />
          </Link>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Vendor workspace</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">{name ?? "Vendor"}</p>
        </div>

        <nav aria-label="Vendor dashboard" className="mt-5 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActivePath(pathname, item.href)
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/10"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

