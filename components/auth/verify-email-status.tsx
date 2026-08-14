"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "verifying" | "success" | "error";

export function VerifyEmailStatus() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string | null>(
    token ? null : "This verification link is missing or invalid.",
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function confirm() {
      try {
        const response = await fetch("/api/account/email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          setStatus("error");
          setMessage(data?.error ?? "Could not verify your email. Please try again.");
          return;
        }

        setStatus("success");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("We could not reach the server. Check your internet and try again.");
        }
      }
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Verifying your email...
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your email is verified.
        </div>
        <Link
          href="/dashboard"
          className="inline-block w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
      <Link href="/dashboard" className="text-sm font-semibold text-emerald-700 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
