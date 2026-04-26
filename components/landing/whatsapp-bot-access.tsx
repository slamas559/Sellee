"use client";

import { useMemo, useState } from "react";

type WhatsAppBotAccessProps = {
  botNumber: string;
};

export function WhatsAppBotAccess({ botNumber }: WhatsAppBotAccessProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const cleanedNumber = useMemo(() => botNumber.replace(/\s+/g, ""), [botNumber]);
  const chatLink = useMemo(() => `https://wa.me/${cleanedNumber}`, [cleanedNumber]);
  const displayNumber = useMemo(
    () => (cleanedNumber.startsWith("+") ? cleanedNumber : `+${cleanedNumber}`),
    [cleanedNumber],
  );
  const qrCodeUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(chatLink)}`,
    [chatLink],
  );

  async function handleCopyNumber() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(displayNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("Could not copy number.");
    }
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Quick Support
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Chat with Sellee Bot
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Open bot chat for order help, vendor commands, and quick store support.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Bot number: <span className="font-semibold text-slate-700">{displayNumber}</span>
          </p>
        </div>

        <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-2 md:block">
          <img
            src={qrCodeUrl}
            alt="QR code to open Sellee WhatsApp bot"
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <a
          href={chatLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:text-sm"
        >
          Open WhatsApp
        </a>
        <button
          type="button"
          onClick={handleCopyNumber}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 sm:text-sm"
        >
          {copied ? "Number Copied" : "Copy Bot Number"}
        </button>
      </div>

      {copyError ? (
        <p className="mt-2 text-xs text-rose-600">{copyError}</p>
      ) : null}

      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:hidden">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-slate-600">
          Show QR Code
        </summary>
        <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-2">
          <img
            src={qrCodeUrl}
            alt="QR code to open Sellee WhatsApp bot"
            width={132}
            height={132}
            className="h-[132px] w-[132px] rounded-md"
          />
        </div>
      </details>
    </section>
  );
}
