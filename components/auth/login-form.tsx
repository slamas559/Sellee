"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.4Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-0.9 6.7-2.5l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 13.7a6 6 0 0 1 0-3.4V7.6H2.9a10 10 0 0 0 0 8.8l3.4-2.7Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.4 2.7C7.1 7.8 9.4 6 12 6Z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
        className="auth-stagger-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-100/60 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-100"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </form>
  );
}
