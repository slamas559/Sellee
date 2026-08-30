"use client";

import { useCallback, useEffect, useState } from "react";

interface Admin {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminsPanel() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin-console/admins");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load admins.");
      setAdmins(data.admins ?? []);
      setPendingInvites(data.pendingInvites ?? []);
      setCurrentAdminId(data.currentAdminId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admins.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsInviting(true);
    setInviteMessage(null);
    try {
      const response = await fetch("/api/admin-console/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setInviteMessage(data.error ?? "Could not send invite.");
        return;
      }
      setInviteEmail("");
      setInviteMessage("Invite sent.");
      load();
    } catch {
      setInviteMessage("Couldn't reach the server.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this admin's access? This deletes their admin account.")) return;
    setRevokingId(id);
    try {
      const response = await fetch(`/api/admin-console/admins/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error ?? "Could not revoke access.");
        return;
      }
      load();
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <p className="atlas-kicker mb-2">Invite an admin</p>
        <form onSubmit={handleInvite} className="atlas-panel flex items-center gap-2 p-3">
          <input
            type="email"
            required
            placeholder="name@example.com"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            className="atlas-input"
          />
          <button type="submit" disabled={isInviting} className="atlas-btn shrink-0" data-variant="primary">
            {isInviting ? "Sending…" : "Send invite"}
          </button>
        </form>
        {inviteMessage ? (
          <p className="mt-2 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
            {inviteMessage}
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="atlas-badge" data-tone="danger" style={{ display: "block", padding: "8px 10px" }}>
          {error}
        </p>
      ) : null}

      <section>
        <p className="atlas-kicker mb-2">Admins ({isLoading ? "…" : admins.length})</p>
        <div className="atlas-panel overflow-hidden">
          <table className="atlas-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.full_name || "—"}</td>
                  <td className="atlas-figure">{admin.email}</td>
                  <td className="atlas-figure">{formatDate(admin.created_at)}</td>
                  <td className="text-right">
                    {admin.id === currentAdminId ? (
                      <span className="atlas-badge" data-tone="neutral">You</span>
                    ) : (
                      <button
                        type="button"
                        className="atlas-btn"
                        data-variant="danger"
                        disabled={revokingId === admin.id}
                        onClick={() => handleRevoke(admin.id)}
                      >
                        {revokingId === admin.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center" style={{ color: "var(--atlas-text-muted)" }}>
                    No admins yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {pendingInvites.length > 0 ? (
        <section>
          <p className="atlas-kicker mb-2">Pending invites</p>
          <div className="atlas-panel overflow-hidden">
            <table className="atlas-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Sent</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="atlas-figure">{invite.email}</td>
                    <td className="atlas-figure">{formatDate(invite.created_at)}</td>
                    <td className="atlas-figure">{formatDate(invite.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
