"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { mainAppUrl } from "@/lib/store-url";

type UserMenuProps = {
  isLoggedIn: boolean;
  isVendor: boolean;
  /**
   * Resolves an app-wide path ("/login", "/account", etc.) to a link that
   * works correctly even when this menu is rendered on a vendor's
   * subdomain - see appHref() in site-header.tsx (this menu is always part
   * of the header, so it renders on every page including storefronts).
   * Defaults to identity (plain relative paths) so this component still
   * works standalone if ever rendered outside the header.
   */
  appHref?: (path: string) => string;
};

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
          className="absolute right-0 top-11 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          {!isLoggedIn ? (
            <>
              <Link
                href={appHref("/login")}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Login / Create account
              </Link>
              <Link
                href={appHref("/become-vendor")}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Become a Vendor
              </Link>
            </>
          ) : (
            <>
              {isVendor ? (
                <Link
                  href={appHref("/dashboard")}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href={appHref("/become-vendor")}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Become a Vendor
                </Link>
              )}
              <Link
                href={appHref("/account")}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Account
              </Link>
              <Link
                href={appHref("/account/orders")}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                My Orders
              </Link>
              <Link
                href={appHref("/account/favorites")}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Saved items
              </Link>
              <Link
                href={appHref("/account/follows")}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Followed Vendors
              </Link>
              <div className="mt-1 border-t border-slate-100 pt-1">
                <SignOutButton
                  callbackUrl={mainAppUrl("/")}
                  label="Logout"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}