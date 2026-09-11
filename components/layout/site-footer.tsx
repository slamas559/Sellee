"use client";

import { PhoneCall } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export function SiteFooter() {
  const [showToTop, setShowToTop] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const botNumber = (process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER ?? "").trim();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const cleanedBotNumber = useMemo(() => botNumber.replace(/\s+/g, ""), [botNumber]);
  const botChatLink = useMemo(() => `https://wa.me/${cleanedBotNumber}`, [cleanedBotNumber]);
  const botDisplayNumber = useMemo(
    () => (cleanedBotNumber.startsWith("+") ? cleanedBotNumber : `+${cleanedBotNumber}`),
    [cleanedBotNumber],
  );
  const botQrCodeUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(botChatLink)}`,
    [botChatLink],
  );

  async function handleCopyBotNumber() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(botDisplayNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("Could not copy number.");
    }
  }

  useEffect(() => {
    function onScroll() {
      const shouldShow = window.scrollY > 360;
      setShowToTop(shouldShow);

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      if (shouldShow) {
        hideTimerRef.current = window.setTimeout(() => {
          setShowToTop(false);
        }, 1800);
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <footer className="mt-10 border-t border-emerald-100 bg-white/95 backdrop-blur">
        {botNumber ? (
          <div className="border-b border-emerald-100 bg-emerald-50/70">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl border border-emerald-200 bg-white p-1.5 md:block">
                  <Image
                    src={botQrCodeUrl}
                    alt="QR code to open Sellee WhatsApp bot"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg"
                    unoptimized
                  />
                </div>
                <div>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                    Chat with Sellee Bot
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-slate-600">
                    Order help, vendor commands, and quick store support right in WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                <a
                  href={botChatLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <span className="text-white">Open WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyBotNumber}
                  className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-emerald-700 hover:decoration-emerald-400"
                >
                  {copied ? "Number Copied" : `Copy: ${botDisplayNumber}`}
                </button>
              </div>
            </div>
            {copyError ? (
              <p className="mx-auto max-w-7xl px-4 pb-3 text-xs text-rose-600 sm:px-6">{copyError}</p>
            ) : null}
          </div>
        ) : null}

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
                <Link href="/about" className="transition hover:text-emerald-700">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition hover:text-emerald-700">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/help" className="transition hover:text-emerald-700">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/become-vendor" className="transition hover:text-emerald-700">
                  Start Selling
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
              Visit the help center or contact Sellee Support.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/help" className="transition hover:text-emerald-700">
                  Open Help Center
                </Link>
              </li>
              <li>
                <a href="mailto:support@sellee.store" className="transition hover:text-emerald-700">
                  support@sellee.store
                </a>
              </li>
              <li>
                <a href="tel:08100596007" className="flex items-center transition hover:text-emerald-700">
                  <PhoneCall size={14}/> <span> : 08100596007</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/2348100596007"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-emerald-700"
                >
                  WhatsApp support
                </a>
              </li>
            </ul>
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
          className="fixed bottom-32 right-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg transition hover:bg-emerald-50 sm:bottom-23 sm:right-9"
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
