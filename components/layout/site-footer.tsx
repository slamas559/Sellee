"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteFooter() {
  const [showToTop, setShowToTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowToTop(window.scrollY > 360);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <footer className="mt-10 border-t border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:gap-10">
          <section className="space-y-3">
            <h3 className="text-xl font-black tracking-tight text-slate-900">Sellee</h3>
            <p className="text-sm leading-6 text-slate-600">
              Discover trusted local vendors, browse products, and manage orders with
              WhatsApp-powered workflows.
            </p>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/" className="transition hover:text-emerald-700">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="transition hover:text-emerald-700">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/vendors" className="transition hover:text-emerald-700">
                  Vendors
                </Link>
              </li>
              <li>
                <Link href="/become-vendor" className="transition hover:text-emerald-700">
                  Become a Vendor
                </Link>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">
              Legal
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/privacy" className="transition hover:text-emerald-700">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition hover:text-emerald-700">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="transition hover:text-emerald-700">
                  Data Deletion
                </Link>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">
              Support
            </h4>
            <p className="text-sm leading-6 text-slate-600">
              Need help with your account, store setup, or WhatsApp bot integration?
              Visit your dashboard integrations and account pages.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-100">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
            <p>© {new Date().getFullYear()} Sellee. All rights reserved.</p>
            <p>Built for modern local commerce.</p>
          </div>
        </div>
      </footer>

      {showToTop ? (
        <button
          type="button"
          aria-label="Back to top"
          onClick={scrollToTop}
          className="fixed bottom-5 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg transition hover:bg-emerald-50 sm:bottom-6 sm:right-6"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      ) : null}
    </>
  );
}

