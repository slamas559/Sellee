import type { Metadata } from "next";
import { listAuditLog } from "@/lib/audit-log";

export const metadata: Metadata = { title: "Audit log" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

export default async function AuditLogPage() {
  const entries = await listAuditLog(200);

  return (
    <div>
      <p className="atlas-kicker">Console</p>
      <h1 className="atlas-display mb-1 mt-1 text-[24px] font-medium">Audit log</h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        Every admin action, most recent first. Showing the last {entries.length} entries.
      </p>

      <div className="atlas-panel overflow-hidden">
        <table className="atlas-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="atlas-figure whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                <td>{entry.admin_name || entry.admin_email || "—"}</td>
                <td>
                  <span className="atlas-badge" data-tone="neutral">
                    {entry.action}
                  </span>
                </td>
                <td className="atlas-figure">
                  {entry.target_type ? `${entry.target_type}${entry.target_id ? `:${entry.target_id}` : ""}` : "—"}
                </td>
                <td className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                  {describeMetadata(entry.metadata)}
                </td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ color: "var(--atlas-text-muted)" }}>
                  No admin actions recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
