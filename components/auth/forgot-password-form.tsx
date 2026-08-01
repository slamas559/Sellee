"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }

      // Always shows the generic success state, regardless of whether the
      // email was actually registered - the API deliberately never reveals
      // that either way.
      setStatus("sent");
    } catch {
      setError("We could not reach the server. Check your internet and try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent a
          password reset link. Check your inbox (and spam folder).
        </div>
        <Link href="/login" className="text-sm font-semibold text-emerald-700 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
          placeholder="johndoe@example.com"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Send reset link"}
      </button>

      <Link href="/login" className="block text-center text-sm font-semibold text-emerald-700 hover:underline">
        Back to login
      </Link>
    </form>
  );
}