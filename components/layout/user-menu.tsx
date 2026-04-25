"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

type UserMenuProps = {
  isLoggedIn: boolean;
  isVendor: boolean;
};

export function UserMenu({ isLoggedIn, isVendor }: UserMenuProps) {
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
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Login / Create account
              </Link>
              <Link
                href="/become-vendor"
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
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/become-vendor"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Become a Vendor
                </Link>
              )}
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Account
              </Link>
              <div className="mt-1 border-t border-slate-100 pt-1">
                <SignOutButton
                  callbackUrl="/"
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

