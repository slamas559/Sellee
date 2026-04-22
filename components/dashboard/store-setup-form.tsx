"use client";

import { useState } from "react";
import type { StoreRecord } from "@/types";

type StoreSetupFormProps = {
  initialStore: StoreRecord | null;
};

const TEMPLATE_OPTIONS = [
  {
    key: "classic" as const,
    label: "Classic",
    description: "Balanced hero + grid layout for general stores.",
    previewClass: "from-white via-emerald-50 to-amber-50",
  },
  {
    key: "bold" as const,
    label: "Bold",
    description: "Stronger visuals, high-contrast sections, statement cards.",
    previewClass: "from-slate-900 via-slate-800 to-emerald-900",
  },
  {
    key: "minimal" as const,
    label: "Minimal",
    description: "Clean product-first layout with subtle UI chrome.",
    previewClass: "from-white via-slate-50 to-white",
  },
];

export function StoreSetupForm({ initialStore }: StoreSetupFormProps) {
  const [store, setStore] = useState<StoreRecord | null>(initialStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialStore?.name ?? "",
    whatsapp_number: initialStore?.whatsapp_number ?? "",
    address_line1: initialStore?.address_line1 ?? "",
    city: initialStore?.city ?? "",
    state: initialStore?.state ?? "",
    country: initialStore?.country ?? "Nigeria",
    latitude: initialStore?.latitude?.toString() ?? "",
    longitude: initialStore?.longitude?.toString() ?? "",
    location_source: initialStore?.location_source ?? "manual",
    store_template: initialStore?.store_template ?? "classic",
    theme_color: initialStore?.theme_color ?? "#0ea5e9",
    logo_url: initialStore?.logo_url ?? "",
    is_active: initialStore?.is_active ?? true,
  });

  const shareablePath = store?.slug ? `/store/${store.slug}` : null;
  const hasCoordinates = Boolean(form.latitude && form.longitude);

  function updateFormField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setIsDetectingLocation(true);
    setError(null);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location_source: "gps",
        }));

        setMessage("Location detected. You can still edit address details manually.");
        setIsDetectingLocation(false);
      },
      () => {
        setError("Could not detect your location. Please enter it manually.");
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const parsedLatitude = form.latitude.trim() ? Number.parseFloat(form.latitude) : null;
    const parsedLongitude = form.longitude.trim() ? Number.parseFloat(form.longitude) : null;

    if ((parsedLatitude === null) !== (parsedLongitude === null)) {
      setError("Enter both latitude and longitude, or leave both empty.");
      setIsSaving(false);
      return;
    }

    if (parsedLatitude !== null && Number.isNaN(parsedLatitude)) {
      setError("Latitude must be a valid number.");
      setIsSaving(false);
      return;
    }

    if (parsedLongitude !== null && Number.isNaN(parsedLongitude)) {
      setError("Longitude must be a valid number.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          location_source: parsedLatitude !== null && parsedLongitude !== null ? form.location_source : null,
        }),
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
        address_line1: payload.store.address_line1 ?? "",
        city: payload.store.city ?? "",
        state: payload.store.state ?? "",
        country: payload.store.country ?? "Nigeria",
        latitude: payload.store.latitude?.toString() ?? "",
        longitude: payload.store.longitude?.toString() ?? "",
        location_source: payload.store.location_source ?? "manual",
        store_template: payload.store.store_template ?? "classic",
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
          <p className="text-sm font-medium text-emerald-700">Store Setup</p>
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
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
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
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
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
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              />
            </div>
          </label>

          <div className="col-span-full space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Storefront Template Preview
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {TEMPLATE_OPTIONS.map((option) => {
                const selected = form.store_template === option.key;
                const isBold = option.key === "bold";

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, store_template: option.key }))
                    }
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div
                      className={`relative mb-3 h-24 overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br ${option.previewClass}`}
                    >
                      <div className="absolute left-2 top-2 flex gap-1">
                        <span className={`h-2 w-6 rounded-full ${isBold ? "bg-emerald-300" : "bg-emerald-500/70"}`} />
                        <span className={`h-2 w-10 rounded-full ${isBold ? "bg-slate-400" : "bg-slate-300"}`} />
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-1">
                        <div className={`h-8 rounded ${isBold ? "bg-slate-700" : "bg-white/80"}`} />
                        <div className={`h-8 rounded ${isBold ? "bg-emerald-700" : "bg-emerald-100"}`} />
                        <div className={`h-8 rounded ${isBold ? "bg-slate-700" : "bg-amber-100"}`} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-600">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Selected template: <span className="font-semibold text-slate-700">{form.store_template}</span>
            </p>
          </div>

          <div className="col-span-full rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Store Location</p>
                <p className="text-xs text-slate-600">
                  Buyers can find your store by location and nearby search.
                </p>
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={isDetectingLocation}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
              >
                {isDetectingLocation ? "Detecting..." : "Use current location"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium text-slate-700">Address line</span>
                <input
                  value={form.address_line1}
                  onChange={(event) => updateFormField("address_line1", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                  placeholder="12 Allen Avenue"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">City</span>
                <input
                  value={form.city}
                  onChange={(event) => updateFormField("city", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                  placeholder="Ikeja"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">State</span>
                <input
                  value={form.state}
                  onChange={(event) => updateFormField("state", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                  placeholder="Lagos"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Country</span>
                <input
                  value={form.country}
                  onChange={(event) => updateFormField("country", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                  placeholder="Nigeria"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Location source</span>
                <select
                  value={form.location_source}
                  onChange={(event) => updateFormField("location_source", event.target.value as "manual" | "gps")}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                >
                  <option value="manual">Manual</option>
                  <option value="gps">GPS</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Latitude (optional)</span>
                <input
                  value={form.latitude}
                  onChange={(event) => updateFormField("latitude", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                  placeholder="6.601838"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Longitude (optional)</span>
                <input
                  value={form.longitude}
                  onChange={(event) => updateFormField("longitude", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                  placeholder="3.351486"
                />
              </label>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              {hasCoordinates
                ? "Coordinates captured. Nearby search will use precise distance."
                : "Tip: Add coordinates for accurate nearby search results."}
            </p>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Logo URL (optional)</span>
            <input
              value={form.logo_url}
              onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
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
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
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
