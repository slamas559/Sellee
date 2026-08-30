"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = { id: string; slug: string; name: string };
type Niche = { id: string; slug: string; name: string; categories: Category[] };
type CatalogResponse = { niches?: Niche[]; error?: string };

const endpoint = "/api/admin-console/catalog";

export function CatalogPanel() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newNicheName, setNewNicheName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedNicheId, setSelectedNicheId] = useState("");
  const [editing, setEditing] = useState<{ type: "niche" | "category"; id: string; name: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<{ type: "niche" | "category"; id: string; label: string } | null>(
    null,
  );

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
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as CatalogResponse;
      if (!response.ok) throw new Error(payload.error ?? "Request failed.");
      setNiches(payload.niches ?? []);
      return payload;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    request("GET").catch(() => {});
  }, []);

  async function handleCreateNiche(event: FormEvent) {
    event.preventDefault();
    if (!newNicheName.trim()) return;
    await request("POST", { type: "niche", name: newNicheName.trim() });
    setNewNicheName("");
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    if (!selectedNicheId || !newCategoryName.trim()) return;
    await request("POST", { type: "category", niche_id: selectedNicheId, name: newCategoryName.trim() });
    setNewCategoryName("");
  }

  async function handleDelete(type: "niche" | "category", id: string) {
    await request("DELETE", { type, id });
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.name.trim()) return;
    await request("PATCH", { type: editing.type, id: editing.id, name: editing.name.trim() });
    setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    await handleDelete(deleting.type, deleting.id);
    setDeleting(null);
  }

  return (
    <div className="max-w-4xl space-y-6">
      {error ? (
        <p className="atlas-badge" data-tone="danger" style={{ display: "block", padding: "8px 10px" }}>
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <form onSubmit={handleCreateNiche} className="atlas-panel p-4">
          <p className="text-[12.5px] font-medium">Add niche</p>
          <input
            value={newNicheName}
            onChange={(event) => setNewNicheName(event.target.value)}
            placeholder="e.g. Furniture"
            className="atlas-input mt-2"
          />
          <button type="submit" disabled={isLoading} className="atlas-btn mt-3" data-variant="primary">
            Save niche
          </button>
        </form>

        <form onSubmit={handleCreateCategory} className="atlas-panel p-4">
          <p className="text-[12.5px] font-medium">Add category</p>
          <select
            value={selectedNicheId}
            onChange={(event) => setSelectedNicheId(event.target.value)}
            className="atlas-input mt-2"
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
            className="atlas-input mt-2"
          />
          <button type="submit" disabled={isLoading} className="atlas-btn mt-3" data-variant="primary">
            Save category
          </button>
        </form>
      </section>

      <section className="atlas-panel divide-y" style={{ borderColor: "var(--atlas-line)" }}>
        {niches.map((niche) => (
          <article key={niche.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-medium">{niche.name}</p>
              <button
                type="button"
                onClick={() => setEditing({ type: "niche", id: niche.id, name: niche.name })}
                className="atlas-btn"
                data-variant="outline"
                style={{ padding: "4px 10px" }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleting({ type: "niche", id: niche.id, label: niche.name })}
                className="atlas-btn"
                data-variant="danger"
                style={{ padding: "4px 10px" }}
              >
                Delete
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {niche.categories.map((category) => (
                <span
                  key={category.id}
                  className="atlas-badge"
                  data-tone="neutral"
                  style={{ gap: "8px" }}
                >
                  {category.name}
                  <button
                    type="button"
                    onClick={() => setEditing({ type: "category", id: category.id, name: category.name })}
                    style={{ color: "var(--atlas-brass-strong)" }}
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleting({ type: "category", id: category.id, label: category.name })
                    }
                    style={{ color: "var(--atlas-danger)" }}
                  >
                    delete
                  </button>
                </span>
              ))}
              {niche.categories.length === 0 ? (
                <span className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                  No categories yet.
                </span>
              ) : null}
            </div>
          </article>
        ))}
        {!isLoading && niches.length === 0 ? (
          <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            No niches yet.
          </p>
        ) : null}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="atlas-panel w-full max-w-sm p-5" style={{ background: "var(--atlas-paper-raised)" }}>
            <h2 className="atlas-display text-[16px] font-medium">
              Edit {editing.type === "niche" ? "niche" : "category"}
            </h2>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <input
                value={editing.name}
                onChange={(event) =>
                  setEditing((current) => (current ? { ...current, name: event.target.value } : null))
                }
                className="atlas-input"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="atlas-btn" data-variant="outline">
                  Cancel
                </button>
                <button type="submit" className="atlas-btn" data-variant="primary">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="atlas-panel w-full max-w-sm p-5" style={{ background: "var(--atlas-paper-raised)" }}>
            <h2 className="atlas-display text-[16px] font-medium">Confirm delete</h2>
            <p className="mt-2 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
              Delete <strong>{deleting.label}</strong>? This can&apos;t be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="atlas-btn" data-variant="outline">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDelete} className="atlas-btn" data-variant="danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
