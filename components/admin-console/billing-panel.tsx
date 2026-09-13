"use client";

import { useEffect, useState } from "react";

interface PlanMixRow {
  planKey: string;
  planName: string;
  activeCount: number;
  mrrContribution: number;
}

interface RecentPaymentRow {
  id: string;
  vendorEmail: string | null;
  vendorName: string | null;
  planKey: string;
  provider: string;
  amount: number;
  billingCycle: string;
  paidAt: string;
}

interface BillingOverview {
  mrr: number;
  totalPayingVendors: number;
  planMix: PlanMixRow[];
  recentPayments: RecentPaymentRow[];
  checkoutConversion: { completed: number; failed: number; conversionRate: number | null };
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="atlas-panel p-4">
      <p className="atlas-kicker">{label}</p>
      <p className="atlas-figure mt-1 text-[20px] font-medium">{value}</p>
      {sub ? (
        <p className="mt-1 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function BillingPanel() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin-console/billing")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load billing data."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="atlas-panel p-4 text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="atlas-panel p-4 text-[13px]" style={{ color: "var(--atlas-danger)" }}>
        {error ?? "Could not load billing data."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="MRR" value={formatNaira(data.mrr)} />
        <StatCard label="Paying vendors" value={String(data.totalPayingVendors)} />
        <StatCard
          label="Checkout conversion (30d)"
          value={data.checkoutConversion.conversionRate !== null ? `${data.checkoutConversion.conversionRate.toFixed(0)}%` : "—"}
          sub={`${data.checkoutConversion.completed} paid / ${data.checkoutConversion.failed} failed`}
        />
        <StatCard
          label="ARPU"
          value={data.totalPayingVendors > 0 ? formatNaira(data.mrr / data.totalPayingVendors) : "—"}
        />
      </div>

      <div className="atlas-panel overflow-hidden">
        <div className="border-b p-4" style={{ borderColor: "var(--atlas-line)" }}>
          <p className="text-[14px] font-semibold">Plan mix</p>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr style={{ color: "var(--atlas-text-muted)" }}>
              <th className="p-4 font-normal">Plan</th>
              <th className="p-4 font-normal">Active subscribers</th>
              <th className="p-4 font-normal">MRR contribution</th>
            </tr>
          </thead>
          <tbody>
            {data.planMix.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={3} style={{ color: "var(--atlas-text-muted)" }}>
                  No paid subscribers yet.
                </td>
              </tr>
            ) : (
              data.planMix.map((row) => (
                <tr key={row.planKey} className="border-t" style={{ borderColor: "var(--atlas-line)" }}>
                  <td className="p-4">{row.planName}</td>
                  <td className="atlas-figure p-4">{row.activeCount}</td>
                  <td className="atlas-figure p-4">{formatNaira(row.mrrContribution)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="atlas-panel overflow-hidden">
        <div className="border-b p-4" style={{ borderColor: "var(--atlas-line)" }}>
          <p className="text-[14px] font-semibold">Recent payments</p>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr style={{ color: "var(--atlas-text-muted)" }}>
              <th className="p-4 font-normal">Vendor</th>
              <th className="p-4 font-normal">Plan</th>
              <th className="p-4 font-normal">Provider</th>
              <th className="p-4 font-normal">Amount</th>
              <th className="p-4 font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentPayments.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={5} style={{ color: "var(--atlas-text-muted)" }}>
                  No payments yet.
                </td>
              </tr>
            ) : (
              data.recentPayments.map((payment) => (
                <tr key={payment.id} className="border-t" style={{ borderColor: "var(--atlas-line)" }}>
                  <td className="p-4">{payment.vendorName ?? payment.vendorEmail ?? "—"}</td>
                  <td className="p-4 capitalize">{payment.planKey}</td>
                  <td className="p-4 capitalize">{payment.provider}</td>
                  <td className="atlas-figure p-4">
                    {formatNaira(payment.amount)}
                    <span className="ml-1 text-[11px]" style={{ color: "var(--atlas-text-muted)" }}>
                      /{payment.billingCycle === "yearly" ? "yr" : "mo"}
                    </span>
                  </td>
                  <td className="p-4">{formatDate(payment.paidAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}