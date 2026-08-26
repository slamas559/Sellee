"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  currentSlug: string;
  onChanged: (newSlug: string) => void;
};

export function ChangeStoreUrlDialog({ currentSlug, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentSlug);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (value === currentSlug) {
      setAvailable(true);
      return;
    }
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stores/slug?slug=${encodeURIComponent(value)}`);
        const data = await res.json();
        setAvailable(Boolean(data.available));
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [value, open, currentSlug]);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stores/slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onChanged(data.slug);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-800"
      >
        Change store URL
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900">Change store URL</h3>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Changing your store URL will break any WhatsApp messages, QR codes,
          or links you've already shared using your current URL:{" "}
          <span className="font-mono">sellee.store/v/{currentSlug}</span>.
          This can't be undone automatically.
        </p>

        <label className="mt-3 block text-xs font-semibold text-slate-700">New URL</label>
        <div className="mt-1 flex items-center rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <span className="text-slate-400">sellee.store/v/</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            className="ml-1 flex-1 outline-none"
          />
        </div>

        {checking && <p className="mt-1 text-xs text-slate-400">Checking availability…</p>}
        {!checking && available === true && value !== currentSlug && (
          <p className="mt-1 text-xs text-emerald-600">Available</p>
        )}
        {!checking && available === false && (
          <p className="mt-1 text-xs text-red-600">Already taken or invalid</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || checking || available !== true || value === currentSlug}
            onClick={handleConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Changing…" : "Change URL"}
          </button>
        </div>
      </div>
    </div>,
   document.body
  );
}