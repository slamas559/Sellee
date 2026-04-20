"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type RegisterResponse = {
  error?: string;
  details?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.phone || !/^\+?[0-9]{10,20}$/.test(form.phone)) {
      setError("Phone number must contain only digits and be 10-20 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: "vendor",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        if (response.status === 409) {
          setError("That email is already registered. Try signing in instead.");
        } else if (response.status === 429) {
          setError(
            "Too many attempts. Please wait a few minutes before trying again.",
          );
        } else {
          setError(
            payload.error ??
              payload.details ??
              "Could not create account right now. Please try again.",
          );
        }

        setIsLoading(false);
        return;
      }

      setSuccess("Account created. Logging you in...");

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      setIsLoading(false);

      if (!result || result.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while creating account. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="vendor@example.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="phone">
          Phone (required for WhatsApp)
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={form.phone}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, phone: event.target.value }))
          }
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="+2348012345678"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              confirmPassword: event.target.value,
            }))
          }
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="Repeat your password"
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
      >
        {isLoading ? "Creating account..." : "Create vendor account"}
      </button>
    </form>
  );
}
