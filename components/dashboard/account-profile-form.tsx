"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  user?: {
    full_name: string | null;
    email: string;
  };
  error?: string;
};

export function AccountProfileForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ full_name: fullName }),
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
      <h2 className="text-lg font-semibold text-slate-900">Edit Profile Name</h2>
      <p className="mt-1 text-sm text-slate-600">
        This name will appear on reviews and account surfaces.
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

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save name"}
          </button>
        </form>
      )}

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
