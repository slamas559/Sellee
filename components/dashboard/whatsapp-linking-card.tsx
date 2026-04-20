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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      setNotice("Code generated. Send LINK <code> to your Sellee business number.");
      await refreshStatus();
    } catch {
      setError("Network error while generating link code.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-sky-700">WhatsApp Linking</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Link Vendor WhatsApp Number</h2>
      <p className="mt-1 text-sm text-slate-600">
        Generate a one-time code, then send <span className="font-semibold">LINK &lt;code&gt;</span> from your vendor phone to the Sellee WhatsApp business number.
      </p>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>
          Linked number: <span className="font-medium">{status.linked?.whatsapp_number ?? "Not linked yet"}</span>
        </p>
        {status.linked?.linked_at ? (
          <p>
            Linked at: <span className="font-medium">{new Date(status.linked.linked_at).toLocaleString()}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Link Code</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{status.pending_code?.code ?? "No active code"}</p>
        <p className="text-xs text-slate-600">
          {status.pending_code?.expires_at
            ? `Expires: ${new Date(status.pending_code.expires_at).toLocaleString()}`
            : "Generate a code to link your number."}
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void generateCode()}
          disabled={isGenerating}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : "Generate Link Code"}
        </button>

        <button
          type="button"
          onClick={() => void refreshStatus()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Refresh Status
        </button>
      </div>
    </section>
  );
}

