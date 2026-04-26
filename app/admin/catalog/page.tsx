"use client";

import { FormEvent, useMemo, useState } from "react";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Niche = {
  id: string;
  slug: string;
  name: string;
  categories: Category[];
};

type CatalogResponse = {
  niches?: Niche[];
  error?: string;
};

const endpoint = "/api/admin/catalog";

export default function AdminCatalogPage() {
  const [password, setPassword] = useState("");
  const [niches, setNiches] = useState<Niche[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newNicheName, setNewNicheName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedNicheId, setSelectedNicheId] = useState("");
  const [editing, setEditing] = useState<{ type: "niche" | "category"; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ type: "niche" | "category"; id: string; label: string } | null>(null);

  const nicheOptions = useMemo(
    () => niches.map((niche) => ({ id: niche.id, label: niche.name })),
    [niches],
  );

  async function request(method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as CatalogResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed.");
      }
      setNiches(payload.niches ?? []);
      return payload;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCatalog(event?: FormEvent) {
    event?.preventDefault();
    if (!password.trim()) {
      setError("Enter your admin password.");
      return;
    }
    await request("GET");
  }

  async function handleCreateNiche(event: FormEvent) {
    event.preventDefault();
    if (!newNicheName.trim()) return;
    await request("POST", { type: "niche", name: newNicheName.trim() });
    setNewNicheName("");
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    if (!selectedNicheId || !newCategoryName.trim()) return;
    await request("POST", {
      type: "category",
      niche_id: selectedNicheId,
      name: newCategoryName.trim(),
    });
    setNewCategoryName("");
  }

  async function handleDelete(type: "niche" | "category", id: string) {
    await request("DELETE", { type, id });
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.name.trim()) return;
    await request("PATCH", {
      type: editing.type,
      id: editing.id,
      name: editing.name.trim(),
    });
    setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    await handleDelete(deleting.type, deleting.id);
    setDeleting(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Admin</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Niche & Category Manager</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is password-protected. Set `CATALOG_ADMIN_PASSWORD` in your environment.
        </p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={loadCatalog}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter admin password"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Unlock"}
          </button>
        </form>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>

      {niches.length > 0 ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={handleCreateNiche}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">Add niche</p>
              <input
                value={newNicheName}
                onChange={(event) => setNewNicheName(event.target.value)}
                placeholder="e.g. Furniture"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Save niche
              </button>
            </form>

            <form
              onSubmit={handleCreateCategory}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">Add category</p>
              <select
                value={selectedNicheId}
                onChange={(event) => setSelectedNicheId(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
              >
                <option value="">Select niche</option>
                {nicheOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="e.g. Sofas"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Save category
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-4">
              {niches.map((niche) => (
                <article key={niche.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-base font-semibold text-slate-900">{niche.name}</p>
                    <button
                      type="button"
                      onClick={() => setEditing({ type: "niche", id: niche.id, name: niche.name })}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleting({
                          type: "niche",
                          id: niche.id,
                          label: niche.name,
                        })
                      }
                      className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {niche.categories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                      >
                        {category.name}
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ type: "category", id: category.id, name: category.name })
                          }
                          className="text-[10px] text-slate-600 hover:text-slate-900"
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleting({
                              type: "category",
                              id: category.id,
                              label: category.name,
                            })
                          }
                          className="text-[10px] text-rose-700 hover:text-rose-900"
                        >
                          delete
                        </button>
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

        </>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Edit {editing.type === "niche" ? "Niche" : "Category"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Update the name below and save your changes.
            </p>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <input
                value={editing.name}
                onChange={(event) =>
                  setEditing((current) => (current ? { ...current, name: event.target.value } : null))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-emerald-300 transition focus:ring-2"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Confirm delete</h2>
            <p className="mt-1 text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{deleting.label}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
