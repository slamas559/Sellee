"use client";

import { useState } from "react";
import { STAFF_PERMISSION_KEYS, STAFF_PERMISSION_LABELS, type StaffPermissionKey } from "@/lib/staff";

type StaffPermissionMap = Record<StaffPermissionKey, boolean>;

type StaffRow = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  permissions: StaffPermissionMap;
};

function emptyPermissions(): StaffPermissionMap {
  return Object.fromEntries(STAFF_PERMISSION_KEYS.map((k) => [k, false])) as StaffPermissionMap;
}

export function StaffManager({
  initialStaff,
  staffLimit,
}: {
  initialStaff: StaffRow[];
  staffLimit: number | null; // null = unlimited (monetization off)
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPermissions, setNewPermissions] = useState<StaffPermissionMap>(emptyPermissions());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const atLimit = staffLimit !== null && staff.length >= staffLimit;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, permissions: newPermissions }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create staff account.");
        return;
      }

      setStaff((prev) => [...prev, data.staff]);
      setTempPassword({ email: data.staff.email, password: data.tempPassword });
      setFullName("");
      setEmail("");
      setNewPermissions(emptyPermissions());
      setShowForm(false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePermission(staffId: string, key: StaffPermissionKey, value: boolean) {
    setSavingRowId(staffId);
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, permissions: { ...s.permissions, [key]: value } } : s)),
    );

    try {
      await fetch(`/api/dashboard/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: { [key]: value } }),
      });
    } finally {
      setSavingRowId(null);
    }
  }

  async function removeStaff(staffId: string) {
    if (!confirm("Remove this staff account? They'll immediately lose access.")) return;

    const prev = staff;
    setStaff((s) => s.filter((row) => row.id !== staffId));

    const res = await fetch(`/api/dashboard/staff/${staffId}`, { method: "DELETE" });
    if (!res.ok) {
      setStaff(prev); // roll back on failure
      setError("Could not remove that staff account.");
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {tempPassword ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">Staff account created for {tempPassword.email}</p>
          <p className="mt-1">
            Temporary password: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{tempPassword.password}</code>
          </p>
          <p className="mt-1 text-emerald-700">
            Share this with them now — it won't be shown again. They can change it from Account settings after logging in.
          </p>
          <button
            type="button"
            onClick={() => setTempPassword(null)}
            className="mt-2 text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {staff.length} staff account{staff.length === 1 ? "" : "s"}
              {staffLimit !== null ? ` of ${staffLimit}` : ""}
            </p>
            {staffLimit === 0 ? (
              <p className="mt-0.5 text-xs text-slate-500">
                Staff accounts aren't included on your current plan. Upgrade to Pro or Business to add staff.
              </p>
            ) : null}
          </div>
          {staffLimit !== 0 ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              disabled={atLimit}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {showForm ? "Cancel" : "Add staff"}
            </button>
          ) : null}
        </div>

        {atLimit ? (
          <p className="mt-2 text-xs text-amber-700">
            You've reached the staff limit for your plan. Remove a staff account or upgrade to add more.
          </p>
        ) : null}

        {showForm ? (
          <form onSubmit={handleCreate} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Full name</span>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STAFF_PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={newPermissions[key]}
                      onChange={(e) => setNewPermissions((p) => ({ ...p, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    {STAFF_PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create staff account"}
            </button>
          </form>
        ) : null}
      </div>

      {staff.length > 0 ? (
        <div className="space-y-3">
          {staff.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{row.full_name ?? row.email}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeStaff(row.id)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                {STAFF_PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={row.permissions[key]}
                      disabled={savingRowId === row.id}
                      onChange={(e) => togglePermission(row.id, key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    {STAFF_PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
