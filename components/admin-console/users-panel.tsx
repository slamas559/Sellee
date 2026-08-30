"use client";

import { useCallback, useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "vendor" | "customer";
  status: "active" | "suspended";
  created_at: string;
  store: { name: string; is_active: boolean } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [role, setRole] = useState<"all" | "vendor" | "customer">("all");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [q, setQ] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ role, status, page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      const response = await fetch(`/api/admin-console/users?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load accounts.");
      setRows(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [role, status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleStatus(row: UserRow) {
    const nextStatus = row.status === "active" ? "suspended" : "active";
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/admin-console/users/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error ?? "Could not update account.");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const response = await fetch(`/api/admin-console/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error ?? "Could not delete account.");
        return;
      }
      setDeleteTarget(null);
      setDeleteConfirmText("");
      load();
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="atlas-panel flex flex-wrap items-center gap-2 p-3">
        <select
          value={role}
          onChange={(e) => {
            setPage(0);
            setRole(e.target.value as typeof role);
          }}
          className="atlas-input w-auto"
        >
          <option value="all">All roles</option>
          <option value="vendor">Vendors</option>
          <option value="customer">Customers</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value as typeof status);
          }}
          className="atlas-input w-auto"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <input
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
          placeholder="Search name or email…"
          className="atlas-input min-w-[220px] flex-1"
        />
      </div>

      {error ? (
        <p className="atlas-badge" data-tone="danger" style={{ display: "block", padding: "8px 10px" }}>
          {error}
        </p>
      ) : null}

      <div className="atlas-panel overflow-hidden">
        <table className="atlas-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Store</th>
              <th>Status</th>
              <th>Since</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.full_name || "—"}</td>
                <td className="atlas-figure">{row.email}</td>
                <td>
                  <span className="atlas-badge" data-tone="neutral">
                    {row.role}
                  </span>
                </td>
                <td>
                  {row.store ? (
                    <span>
                      {row.store.name}
                      {!row.store.is_active ? (
                        <span className="atlas-badge ml-2" data-tone="warn">
                          hidden
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span className="atlas-badge" data-tone={row.status === "active" ? "active" : "warn"}>
                    {row.status}
                  </span>
                </td>
                <td className="atlas-figure">{formatDate(row.created_at)}</td>
                <td className="text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="atlas-btn mr-2"
                    data-variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => handleToggleStatus(row)}
                  >
                    {row.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    className="atlas-btn"
                    data-variant="danger"
                    disabled={busyId === row.id}
                    onClick={() => setDeleteTarget(row)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center" style={{ color: "var(--atlas-text-muted)" }}>
                  No accounts match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
        <span>
          {total} account{total === 1 ? "" : "s"} · page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="atlas-btn"
            data-variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="atlas-btn"
            data-variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="atlas-panel w-full max-w-md p-5" style={{ background: "var(--atlas-paper-raised)" }}>
            <h2 className="atlas-display text-[16px] font-medium">Delete account</h2>
            <p className="mt-2 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
              This permanently deletes <strong>{deleteTarget.email}</strong>
              {deleteTarget.role === "vendor"
                ? ", their store, every product in it (and its images), and their order history. "
                : ". Their past orders are kept, but no longer linked to an account. "}
              This can&apos;t be undone.
            </p>
            <p className="mt-3 text-[12px] font-medium">
              Type <span className="atlas-figure">{deleteTarget.email}</span> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              className="atlas-input mt-2"
              autoFocus
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                className="atlas-btn"
                data-variant="outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText !== deleteTarget.email || busyId === deleteTarget.id}
                className="atlas-btn"
                data-variant="danger"
              >
                {busyId === deleteTarget.id ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
