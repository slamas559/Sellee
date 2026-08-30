"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatNaira } from "@/lib/format";

interface OrderRow {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_whatsapp: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  created_at: string;
  store: { name: string; slug: string } | null;
}

const STATUS_OPTIONS = [
  "all",
  "pending_whatsapp",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "rejected",
];

function statusTone(status: string): "active" | "warn" | "danger" | "neutral" {
  if (status === "delivered" || status === "confirmed") return "active";
  if (status === "cancelled" || status === "rejected") return "danger";
  if (status === "pending_whatsapp") return "warn";
  return "neutral";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function OrdersPanel() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const [status, setStatus] = useState("all");
  const [customerQ, setCustomerQ] = useState("");
  const [storeQ, setStoreQ] = useState(() => searchParams.get("store") ?? "");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, page: String(page) });
      if (customerQ.trim()) params.set("customer", customerQ.trim());
      if (storeQ.trim()) params.set("store", storeQ.trim());
      const response = await fetch(`/api/admin-console/orders?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load orders.");
      setRows(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [status, customerQ, storeQ, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="atlas-panel flex flex-wrap items-center gap-2 p-3">
        <select
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value);
          }}
          className="atlas-input w-auto"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All statuses" : option.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          value={customerQ}
          onChange={(e) => {
            setPage(0);
            setCustomerQ(e.target.value);
          }}
          placeholder="Search customer name or WhatsApp…"
          className="atlas-input min-w-[200px] flex-1"
        />
        <input
          value={storeQ}
          onChange={(e) => {
            setPage(0);
            setStoreQ(e.target.value);
          }}
          placeholder="Filter by store name…"
          className="atlas-input min-w-[180px] flex-1"
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
              <th>Order</th>
              <th>Store</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Placed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="atlas-figure">{row.id.slice(0, 8).toUpperCase()}</td>
                <td>{row.store?.name ?? "—"}</td>
                <td>
                  <div>{row.customer_name || "—"}</div>
                  <div className="atlas-figure text-[11px]" style={{ color: "var(--atlas-text-muted)" }}>
                    {row.customer_whatsapp}
                  </div>
                </td>
                <td>
                  <span className="atlas-badge" data-tone={statusTone(row.status)}>
                    {row.status.replace("_", " ")}
                  </span>
                </td>
                <td className="atlas-figure">{formatNaira(Number(row.total_amount))}</td>
                <td className="atlas-figure">{formatDate(row.created_at)}</td>
                <td className="text-right">
                  <Link href={`/admin-console/orders/${row.id}`} className="atlas-btn" data-variant="outline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center" style={{ color: "var(--atlas-text-muted)" }}>
                  No orders match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
        <span>
          {total} order{total === 1 ? "" : "s"} · page {page + 1} of {totalPages}
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
    </div>
  );
}
