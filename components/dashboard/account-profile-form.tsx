"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  user?: {
    full_name: string | null;
    email: string;
    phone: string | null;
    role: "vendor" | "customer";
  };
  error?: string;
};

export function AccountProfileForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"vendor" | "customer">("customer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = (await response.json()) as MeResponse;
        if (!response.ok || !payload.user) {
          if (mounted) setError(payload.error ?? "Could not load profile.");
          return;
        }
        if (mounted) {
          setFullName(payload.user.full_name ?? "");
          setEmail(payload.user.email);
          setPhone(payload.user.phone ?? "");
          setRole(payload.user.role);
        }
      } catch {
        if (mounted) setError("Network error while loading profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not update profile.");
        return;
      }
      setMessage(payload.message ?? "Profile updated.");
    } catch {
      setError("Network error while updating profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Account Settings</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
            role === "vendor"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {role}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Update your identity and WhatsApp contact used for ordering.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading profile...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Full name</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="Abdul Salam"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">WhatsApp phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="+2348012345678"
            />
            <p className="text-xs text-slate-500">
              This number is used when creating WhatsApp orders.
            </p>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      {!loading ? (
        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm">
          {role === "vendor" ? (
            <Link href="/dashboard" className="font-semibold text-emerald-700 hover:underline">
              Open vendor dashboard
            </Link>
          ) : (
            <Link href="/become-vendor" className="font-semibold text-emerald-700 hover:underline">
              Become a vendor
            </Link>
          )}
          <Link href="/marketplace" className="text-slate-700 hover:text-emerald-700 hover:underline">
            Browse marketplace
          </Link>
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
