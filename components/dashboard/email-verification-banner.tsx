"use client";

import { useState } from "react";

export function EmailVerificationBanner() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSend() {
    setStatus("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/account/email-verification/send", { method: "POST" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus("idle");
        setMessage(data?.error ?? "Could not send the verification email. Please try again.");
        return;
      }

      setStatus("sent");
      setMessage(data?.message ?? "Verification email sent - check your inbox.");
    } catch {
      setStatus("idle");
      setMessage("We could not reach the server. Check your internet and try again.");
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Your account email isn&apos;t verified yet. Shoppers won&apos;t see a Verified badge until you do.</span>
        <button
          type="button"
          onClick={handleSend}
          disabled={status === "sending" || status === "sent"}
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : status === "sent" ? "Sent" : "Send verification email"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-amber-700">{message}</p> : null}
    </div>
  );
}
