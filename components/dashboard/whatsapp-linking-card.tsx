"use client";

import { useState } from "react";
import type { VendorWhatsAppLinkStatus } from "@/lib/dashboard-data";

type WhatsAppLinkingCardProps = {
  initialStatus: VendorWhatsAppLinkStatus;
};

type LinkApiResponse = {
  error?: string;
  code?: string;
  expires_at?: string;
  linked?: {
    whatsapp_number: string;
    linked_at: string;
    is_active: boolean;
  } | null;
  pending_code?: {
    code: string;
    expires_at: string;
  } | null;
};

export function WhatsAppLinkingCard({ initialStatus }: WhatsAppLinkingCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopyingNumber, setIsCopyingNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [numberCopied, setNumberCopied] = useState(false);

  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim() ?? "";
  const hasBotNumber = botNumber.length > 0;
  const botNumberLabel = hasBotNumber
    ? botNumber.startsWith("+")
      ? botNumber
      : `+${botNumber}`
    : "";

  const command = status.pending_code?.code ? `LINK ${status.pending_code.code}` : "";
  const waLink = hasBotNumber && command
    ? `https://wa.me/${botNumber}?text=${encodeURIComponent(command)}`
    : null;
  const waChatLink = hasBotNumber ? `https://wa.me/${botNumber}` : null;
  const qrCodeUrl = waChatLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        waChatLink,
      )}`
    : null;

  async function refreshStatus() {
    try {
      const response = await fetch("/api/whatsapp/link", { cache: "no-store" });
      const payload = (await response.json()) as LinkApiResponse;

      if (!response.ok) {
        setError(payload.error ?? "Could not load WhatsApp link status.");
        return;
      }

      setStatus({
        linked: payload.linked ?? null,
        pending_code: payload.pending_code ?? null,
      });
    } catch {
      setError("Network error while loading WhatsApp link status.");
    }
  }

  async function generateCode() {
    setIsGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/whatsapp/link", {
        method: "POST",
      });

      const payload = (await response.json()) as LinkApiResponse;

      if (!response.ok || !payload.code || !payload.expires_at) {
        setError(payload.error ?? "Could not generate link code.");
        setIsGenerating(false);
        return;
      }

      setStatus((prev) => ({
        ...prev,
        pending_code: {
          code: payload.code ?? "",
          expires_at: payload.expires_at ?? "",
        },
      }));
      setCopied(false);
      setNotice(
        "Code generated. Open WhatsApp and send the prepared LINK command or click the link account button.",
      );
      await refreshStatus();
    } catch {
      setError("Network error while generating link code.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyCommand() {
    if (!command) return;
    setIsCopying(true);
    setError(null);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setNotice("Command copied. Paste it in your WhatsApp chat with the Sellee bot and send.");
    } catch {
      setError("Could not copy command. Copy it manually from the code block.");
    } finally {
      setIsCopying(false);
    }
  }

  async function copyBotNumber() {
    if (!hasBotNumber) return;
    setIsCopyingNumber(true);
    setError(null);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(botNumberLabel);
      setNumberCopied(true);
      setNotice(
        "Bot number copied. Open WhatsApp, start chat with this number, then paste your LINK command.",
      );
    } catch {
      setError("Could not copy bot number. Copy it manually from the bot number panel.");
    } finally {
      setIsCopyingNumber(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
        WhatsApp Bot
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Link Vendor Number</h2>
      <p className="mt-2 text-sm text-slate-600">
        Connect the phone you use as vendor operator. After linking, that number can run bot commands
        like <span className="font-semibold">LIST ORDERS</span> and{" "}
        <span className="font-semibold">CONFIRM &lt;ORDER_REF&gt;</span>.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Generate code</p>
          <p className="mt-1 text-xs text-slate-600">Create a one-time code valid for 10 minutes.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Send LINK command</p>
          <p className="mt-1 text-xs text-slate-600">Open WhatsApp directly or copy and paste the command.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Refresh status</p>
          <p className="mt-1 text-xs text-slate-600">Confirm the linked badge and active vendor number.</p>
        </article>
      </div>

      <div className="mt-5 space-y-2 text-sm text-slate-700">
        <p>
          Linked number:{" "}
          <span className="font-medium">{status.linked?.whatsapp_number ?? "Not linked yet"}</span>
        </p>
        {status.linked?.linked_at ? (
          <p>
            Linked at:{" "}
            <span className="font-medium">{new Date(status.linked.linked_at).toLocaleString()}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bot Chat Access</p>
        <p className="mt-1 text-sm text-slate-600">Use this number to open chat with the Sellee bot account.</p>
        {hasBotNumber ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bot Number</p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{botNumberLabel}</p>
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Bot number is not configured yet. Ask admin to set{" "}
            <span className="font-semibold">NEXT_PUBLIC_WHATSAPP_BOT_NUMBER</span>.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={waChatLink ?? "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!waChatLink}
          >
            <button
              type="button"
              className={`inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              waChatLink
                ? "bg-emerald-600 text-white text-[10px] sm:text-xs hover:bg-emerald-700"
                : "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500"
              }`}
              >
              Message Bot Now
            </button>
          </a>
          <button
            type="button"
            onClick={() => void copyBotNumber()}
            disabled={!hasBotNumber || isCopyingNumber}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-[10px] sm:text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 sm:text-sm"
          >
            {isCopyingNumber ? "Copying..." : numberCopied ? "Number Copied" : "Copy Bot Number"}
          </button>
        </div>
      </div>

      {qrCodeUrl ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scan QR to Open Bot</p>
          <p className="mt-1 text-sm text-slate-600">
            Scan with your phone camera to open the Sellee bot chat instantly.
          </p>
          <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-2">
            <img
              src={qrCodeUrl}
              alt="QR code for Sellee WhatsApp bot chat"
              width={180}
              height={180}
              className="h-[180px] w-[180px] rounded-lg"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Link Code</p>
        <p className="mt-1 text-lg font-semibold tracking-[0.08em] text-slate-900">
          {status.pending_code?.code ?? "No active code"}
        </p>
        <p className="text-xs text-slate-600">
          {status.pending_code?.expires_at
            ? `Expires: ${new Date(status.pending_code.expires_at).toLocaleString()}`
            : "Generate a code to link your number."}
        </p>
        {command ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Command</p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{command}</p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {!hasBotNumber ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Set <span className="font-semibold">NEXT_PUBLIC_WHATSAPP_BOT_NUMBER</span> in env to enable
          the direct &quot;Link Account&quot; button.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => void generateCode()}
          disabled={isGenerating}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
        >
          {isGenerating ? "Generating..." : "Generate Link Code"}
        </button>

        <a
          href={waLink ?? "#"}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!waLink}
          className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            waLink
              ? "bg-sky-600 text-white hover:bg-sky-700"
              : "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500"
          }`}
        >
          Link Account
        </a>

        <button
          type="button"
          onClick={() => void copyCommand()}
          disabled={!command || isCopying}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 sm:text-sm"
        >
          {isCopying ? "Copying..." : copied ? "Copied" : "Copy Command"}
        </button>

        <button
          type="button"
          onClick={() => void refreshStatus()}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 sm:text-sm"
        >
          Refresh Status
        </button>
      </div>
    </section>
  );
}
