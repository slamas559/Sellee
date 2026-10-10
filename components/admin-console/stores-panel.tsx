"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Vendor = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  email_verified_at: string | null;
};

type Store = {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  store_template: string;
  store_theme_preset: string;
  storefront_config: Record<string, unknown> | null;
  rating_avg: number;
  rating_count: number;
  theme_color: string | null;
  is_active: boolean;
  currency: string | null;
  activated_currencies: string[] | null;
  whatsapp_verified_at: string | null;
  vendor_email_verified_at: string | null;
  is_verified: boolean;
  verification_tier: string | null;
  verification_tier_updated_at: string | null;
  tier_demotion_strikes: number | null;
  verification_suspended_at: string | null;
  verification_suspended_reason: string | null;
  created_at: string;
};

type StoreItem = { store: Store; vendor: Vendor | null };
type StoresResponse = { items?: StoreItem[]; total?: number; page?: number; pageSize?: number; error?: string };

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function StoresPanel() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 25;

  useEffect(() => {
    let cancelled = false;

    async function fetchStores() {
      const params = new URLSearchParams({ page: String(page), status });
      if (query.trim()) params.set("q", query.trim());
      try {
        const response = await fetch(`/api/admin-console/stores?${params.toString()}`);
        const data = (await response.json()) as StoresResponse;
        if (!response.ok) throw new Error(data.error ?? "Could not load vendor stores.");
        if (cancelled) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load vendor stores.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchStores();
    return () => {
      cancelled = true;
    };
  }, [page, query, status]);

  async function toggleVisibility(item: StoreItem) {
    const nextActive = !item.store.is_active;
    setBusyId(item.store.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin-console/stores/${item.store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update store visibility.");
      setItems((current) =>
        current.map((entry) =>
          entry.store.id === item.store.id
            ? { ...entry, store: { ...entry.store, is_active: nextActive } }
            : entry,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update store visibility.");
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="atlas-panel flex flex-col gap-2 p-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => {
            setPage(0);
            setQuery(event.target.value);
            setIsLoading(true);
          }}
          placeholder="Search store name, slug, city, or state"
          aria-label="Search vendor stores"
          className="atlas-input min-w-0 flex-1"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(0);
            setStatus(event.target.value as typeof status);
            setIsLoading(true);
          }}
          aria-label="Filter stores by visibility"
          className="atlas-input w-full sm:w-auto"
        >
          <option value="all">All visibility</option>
          <option value="active">Visible</option>
          <option value="inactive">Hidden</option>
        </select>
      </div>

      {error ? (
        <p className="atlas-badge" data-tone="danger" role="alert" style={{ display: "block", padding: "8px 10px" }}>
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {items.map(({ store, vendor }) => (
          <article key={store.id} className="atlas-panel min-w-0 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {store.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold">
                    {store.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-[15px] font-medium">{store.name}</h2>
                    <span className="atlas-badge" data-tone={store.is_active ? "active" : "warn"}>
                      {store.is_active ? "Visible" : "Hidden"}
                    </span>
                    {store.is_verified ? (
                      <span className="atlas-badge" data-tone="active">{store.verification_tier || "Verified"}</span>
                    ) : null}
                  </div>
                  <p className="atlas-figure mt-1 break-all text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                    /v/{store.slug} · {store.city || "Location not set"}{store.state ? `, ${store.state}` : ""}
                  </p>
                  <p className="mt-2 text-[12px]">
                    Owner: <span className="font-medium">{vendor?.full_name || "Name not provided"}</span>
                    {vendor?.email ? <span className="break-all" style={{ color: "var(--atlas-text-muted)" }}> · {vendor.email}</span> : null}
                    {vendor?.status ? <span> · Account {vendor.status}</span> : null}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                <Link
                  href={`/v/${encodeURIComponent(store.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="atlas-btn"
                  data-variant="outline"
                >
                  Open store
                </Link>
                <button
                  type="button"
                  className="atlas-btn"
                  data-variant={store.is_active ? "danger" : "outline"}
                  disabled={busyId === store.id || vendor?.status === "suspended"}
                  title={vendor?.status === "suspended" ? "Reactivate the owner account first." : undefined}
                  onClick={() => void toggleVisibility({ store, vendor })}
                >
                  {busyId === store.id ? "Saving…" : store.is_active ? "Hide store" : "Make visible"}
                </button>
              </div>
            </div>

            <details className="mt-4 border-t pt-3" style={{ borderColor: "var(--atlas-line)" }}>
              <summary className="cursor-pointer text-[12px] font-medium">View full store and owner information</summary>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="min-w-0">
                  <h3 className="mb-2 text-[12px] font-semibold">Store record</h3>
                  <dl className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2">
                    {Object.entries(store).map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <dt className="break-words text-[10px] uppercase tracking-wide" style={{ color: "var(--atlas-text-muted)" }}>
                          {key.replaceAll("_", " ")}
                        </dt>
                        <dd className="mt-0.5 break-words text-[11px]">
                          {typeof value === "object" && value !== null ? (
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-black/5 p-2 text-[10px]">
                              {display(value)}
                            </pre>
                          ) : display(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section className="min-w-0">
                  <h3 className="mb-2 text-[12px] font-semibold">Owner account</h3>
                  {vendor ? (
                    <dl className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2">
                      {Object.entries(vendor).map(([key, value]) => (
                        <div key={key} className="min-w-0">
                          <dt className="break-words text-[10px] uppercase tracking-wide" style={{ color: "var(--atlas-text-muted)" }}>
                            {key.replaceAll("_", " ")}
                          </dt>
                          <dd className="mt-0.5 break-words text-[11px]">{display(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>Owner account details are unavailable.</p>
                  )}
                  <Link href="/admin-console/users" className="mt-3 inline-block text-[11px] underline" style={{ color: "var(--atlas-brass-strong)" }}>
                    Manage vendor accounts
                  </Link>
                </section>
              </div>
            </details>
          </article>
        ))}

        {!isLoading && items.length === 0 ? (
          <div className="atlas-panel p-6 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            No stores match these filters.
          </div>
        ) : null}
        {isLoading ? (
          <div className="atlas-panel p-6 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            Loading stores…
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 text-[12px] sm:flex-row sm:items-center sm:justify-between" style={{ color: "var(--atlas-text-muted)" }}>
        <span>{total} store{total === 1 ? "" : "s"} · page {page + 1} of {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" className="atlas-btn" data-variant="outline" disabled={page === 0 || isLoading} onClick={() => { setIsLoading(true); setPage((current) => current - 1); }}>
            Previous
          </button>
          <button type="button" className="atlas-btn" data-variant="outline" disabled={page + 1 >= totalPages || isLoading} onClick={() => { setIsLoading(true); setPage((current) => current + 1); }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
