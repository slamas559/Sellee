"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Ticket {
  id: string;
  ticket_ref: string;
  requester_email: string;
  requester_name: string | null;
  issue_type: string;
  details: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
}

interface Report {
  id: string;
  product_id: string;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: "open" | "dismissed" | "actioned";
  created_at: string;
  product: { id: string; name: string; store_id: string; store: { name: string; slug: string } | null } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function TicketsSection() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin-console/support-tickets?status=${status}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok) setTickets(data.tickets ?? []);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, newStatus: Ticket["status"]) {
    setBusyId(id);
    try {
      await fetch("/api/admin-console/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="atlas-kicker">Support tickets</p>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="atlas-input w-auto" style={{ fontSize: 12 }}>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="atlas-panel divide-y" style={{ borderColor: "var(--atlas-line)" }}>
        {tickets.map((ticket) => (
          <div key={ticket.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="atlas-figure text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
                  {ticket.ticket_ref}
                </span>{" "}
                <span className="text-[13px] font-medium">{ticket.issue_type}</span>
              </div>
              <span className="atlas-badge" data-tone="neutral">
                {ticket.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
              {ticket.requester_name || "Unknown"} · {ticket.requester_email} · {formatDate(ticket.created_at)}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
              className="mt-2 text-[11.5px]"
              style={{ color: "var(--atlas-brass-strong)" }}
            >
              {expanded === ticket.id ? "Hide details" : "View details"}
            </button>
            {expanded === ticket.id ? (
              <>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px]" style={{ color: "var(--atlas-text)" }}>
                  {ticket.details}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busyId === ticket.id || ticket.status === s}
                      onClick={() => updateStatus(ticket.id, s)}
                      className="atlas-btn"
                      data-variant="outline"
                      style={{ padding: "4px 10px", fontSize: 11.5 }}
                    >
                      Mark {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ))}
        {tickets.length === 0 ? (
          <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            No tickets here.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin-console/product-reports?status=${status}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok) setReports(data.reports ?? []);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, newStatus: Report["status"]) {
    setBusyId(id);
    try {
      await fetch("/api/admin-console/product-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="atlas-kicker">Reported products</p>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="atlas-input w-auto" style={{ fontSize: 12 }}>
          <option value="open">Open</option>
          <option value="dismissed">Dismissed</option>
          <option value="actioned">Actioned</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="atlas-panel divide-y" style={{ borderColor: "var(--atlas-line)" }}>
        {reports.map((report) => (
          <div key={report.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[13px] font-medium">{report.product?.name ?? "Deleted product"}</span>
                {report.product?.store ? (
                  <span className="ml-2 text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
                    {report.product.store.name}
                  </span>
                ) : null}
              </div>
              <span className="atlas-badge" data-tone="warn">
                {report.reason}
              </span>
            </div>
            {report.details ? (
              <p className="mt-1 text-[12.5px]" style={{ color: "var(--atlas-text-muted)" }}>
                {report.details}
              </p>
            ) : null}
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              {report.reporter_email || "Anonymous"} · {formatDate(report.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {report.product ? (
                <Link
                  href={`/v/${report.product.store?.slug ?? ""}`}
                  target="_blank"
                  className="atlas-btn"
                  data-variant="outline"
                  style={{ padding: "4px 10px", fontSize: 11.5 }}
                >
                  View storefront ↗
                </Link>
              ) : null}
              <button
                type="button"
                disabled={busyId === report.id}
                onClick={() => updateStatus(report.id, "dismissed")}
                className="atlas-btn"
                data-variant="outline"
                style={{ padding: "4px 10px", fontSize: 11.5 }}
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={busyId === report.id}
                onClick={() => updateStatus(report.id, "actioned")}
                className="atlas-btn"
                data-variant="danger"
                style={{ padding: "4px 10px", fontSize: 11.5 }}
              >
                Mark actioned
              </button>
            </div>
          </div>
        ))}
        {reports.length === 0 ? (
          <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            No reports here.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function SupportPanel() {
  return (
    <div className="max-w-3xl space-y-8">
      <TicketsSection />
      <ReportsSection />
    </div>
  );
}