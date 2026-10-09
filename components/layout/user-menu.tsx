"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { mainAppUrl } from "@/lib/store-url";

type UserMenuProps = {
  isLoggedIn: boolean;
  isVendor: boolean;
  appHref?: (path: string) => string;
};

type MenuLinkProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function MenuLink({ href, icon: Icon, label, onClick }: MenuLinkProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function UserMenu({ isLoggedIn, isVendor, appHref = (path) => path }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          {!isLoggedIn ? (
            <>
              <MenuLink href={appHref("/login")} icon={LogIn} label="Login / Create account" onClick={() => setOpen(false)} />
              <MenuLink href={appHref("/become-vendor")} icon={Store} label="Become a Vendor" onClick={() => setOpen(false)} />
            </>
          ) : (
            <>
              {isVendor ? (
                <MenuLink href={appHref("/dashboard")} icon={LayoutDashboard} label="Dashboard" onClick={() => setOpen(false)} />
              ) : (
                <MenuLink href={appHref("/become-vendor")} icon={Store} label="Become a Vendor" onClick={() => setOpen(false)} />
              )}
              <MenuLink href={appHref("/account")} icon={UserRound} label="Account" onClick={() => setOpen(false)} />
              <MenuLink href={appHref("/account/orders")} icon={ClipboardList} label="My Orders" onClick={() => setOpen(false)} />
              <MenuLink href={appHref("/account/favorites")} icon={Heart} label="Saved items" onClick={() => setOpen(false)} />
              <MenuLink href={appHref("/account/follows")} icon={Users} label="Followed Vendors" onClick={() => setOpen(false)} />
              <div className="mt-1 border-t border-slate-100 pt-1">
                <SignOutButton
                  callbackUrl={mainAppUrl("/")}
                  label="Logout"
                  icon={LogOut}
                  className="inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}