"use client";

import { useState } from "react";
import type { StoreRecord } from "@/types";

type StoreSetupFormProps = {
  initialStore: StoreRecord | null;
};

export function StoreSetupForm({ initialStore }: StoreSetupFormProps) {
  const [store, setStore] = useState<StoreRecord | null>(initialStore);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialStore?.name ?? "",
    whatsapp_number: initialStore?.whatsapp_number ?? "",
    theme_color: initialStore?.theme_color ?? "#0ea5e9",
    logo_url: initialStore?.logo_url ?? "",
    is_active: initialStore?.is_active ?? true,
  });

  const shareablePath = store?.slug ? `/store/${store.slug}` : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not save store setup.");
        setIsSaving(false);
        return;
      }

      setStore(payload.store);
      setForm({
        name: payload.store.name,
        whatsapp_number: payload.store.whatsapp_number,
        theme_color: payload.store.theme_color ?? "#0ea5e9",
        logo_url: payload.store.logo_url ?? "",
        is_active: payload.store.is_active,
      });

      setMessage(
        payload.action === "created"
          ? "Store created successfully."
          : "Store updated successfully.",
      );
    } catch {
      setError("Network error while saving store setup.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sky-700">Store Setup</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {store ? "Update your store" : "Create your store"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            This powers your public storefront page and shareable link.
          </p>
        </div>
      </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Store name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
              placeholder="Ada Kitchen"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">WhatsApp number</span>
            <input
              required
              value={form.whatsapp_number}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, whatsapp_number: event.target.value }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
              placeholder="2348012345678"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Theme color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.theme_color}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, theme_color: event.target.value }))
                }
                className="h-10 w-12 rounded border border-slate-300 bg-white"
              />
              <input
                value={form.theme_color}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, theme_color: event.target.value }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
              />
            </div>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Logo URL (optional)</span>
            <input
              value={form.logo_url}
              onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
              placeholder="https://..."
            />
          </label>

          <label className="col-span-full flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Store is active and visible publicly.
          </label>

          {error ? (
            <p className="col-span-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="col-span-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="col-span-full flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : store ? "Update store" : "Create store"}
            </button>

            {shareablePath ? (
              <a
                href={shareablePath}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Open public store
              </a>
            ) : null}
          </div>

          {store?.slug ? (
            <p className="col-span-full text-sm text-slate-600">
              Shareable link: <span className="font-medium">{shareablePath}</span>
            </p>
          ) : null}
        </form>
    </section>
  );
}
