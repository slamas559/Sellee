"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/auth/password-input";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Could not reset password. Please try again.");
        setStatus("idle");
        return;
      }

      setStatus("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("We could not reach the server. Check your internet and try again.");
      setStatus("idle");
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This reset link is missing or invalid. Please request a new one.
        </div>
        <Link href="/forgot-password" className="text-sm font-semibold text-emerald-700 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Password updated. Redirecting you to login...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          New password
        </label>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
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
        {status === "loading" ? "Updating..." : "Reset password"}
      </button>
    </form>
  );
}