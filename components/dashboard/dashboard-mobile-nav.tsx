"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardMobileNavProps = {
  name?: string | null;
  email?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: "home" | "user" | "store" | "box" | "orders" | "chart" | "plug";
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/account", label: "Account", icon: "user" },
  { href: "/dashboard/store", label: "Storefront", icon: "store" },
  { href: "/dashboard/products", label: "Products", icon: "box" },
  { href: "/dashboard/orders", label: "Orders", icon: "orders" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard/integrations", label: "Integrations", icon: "plug" },
];

const bottomTabs = ["/dashboard", "/dashboard/products", "/dashboard/orders", "/dashboard/analytics", "/dashboard/account"];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ type, className }: { type: NavItem["icon"]; className?: string }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (type === "home") return <svg {...shared}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.8V20h13V9.8" /></svg>;
  if (type === "user") return <svg {...shared}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
  if (type === "store") return <svg {...shared}><path d="M4 9h16l-1.3 11H5.3L4 9Z" /><path d="M7 9V6a5 5 0 0 1 10 0v3" /></svg>;
  if (type === "box") return <svg {...shared}><path d="m3 7 9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></svg>;
  if (type === "orders") return <svg {...shared}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>;
  if (type === "chart") return <svg {...shared}><path d="M4 19h16" /><path d="M7 16v-5" /><path d="M12 16V8" /><path d="M17 16v-9" /></svg>;
  return <svg {...shared}><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.1-1.1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.6a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.1-1.1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" /></svg>;
}

export function DashboardMobileNav({ name, email }: DashboardMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentLabel = useMemo(() => {
    const active = navItems.find((item) => isActivePath(pathname, item.href));
    return active?.label ?? "Dashboard";
  }, [pathname]);

  const bottomNavItems = navItems.filter((item) => bottomTabs.includes(item.href));

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Sellee</p>
            <p className="text-sm font-semibold text-slate-900">{currentLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open dashboard menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[86%] max-w-[320px] overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Sellee</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Vendor Console</h2>
                <p className="mt-1 text-sm font-medium text-slate-700">{name ?? "Vendor"}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{email ?? ""}</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActivePath(pathname, item.href)
                      ? "bg-emerald-600 text-white"
                      : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <NavIcon type={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <SignOutButton />
            </div>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 py-1.5 backdrop-blur lg:hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-5 gap-1">
          {bottomNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <NavIcon type={item.icon} className="h-4 w-4" />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
