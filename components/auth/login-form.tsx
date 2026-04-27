"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const googleCallbackUrl = params.get("callbackUrl") ?? "/account?onboarding=google";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError(
          "Login failed. Please check your email and password, then try again.",
        );
        setIsLoading(false);
        return;
      }

      const next = params.get("callbackUrl") ?? "/";
      router.push(next);
      router.refresh();
    } catch {
      setError(
        "We could not reach the server. Check your internet and try again.",
      );
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4">
      <div className="auth-stagger-1 space-y-2">
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
          placeholder="you@example.com"
        />
      </div>

      <div className="auth-stagger-2 space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
          placeholder="Minimum 8 characters"
        />
      </div>

      {error ? (
        <p className="auth-stagger-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="auth-stagger-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: googleCallbackUrl })}
        className="auth-stagger-5 w-full rounded-xl border border-yellow-300 bg-yellow-100/60 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-100"
      >
        Continue with Google
      </button>
    </form>
  );
}
