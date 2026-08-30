"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatNaira } from "@/lib/format";
import { DateRangePicker, type DateRangeValue } from "./date-range-picker";
import { RevenueTrendChart, type RevenueTrendPoint } from "./revenue-trend-chart";
import { SignupsTrendChart } from "./signups-trend-chart";
import { TrafficSourcesList, type TrafficSourceRow } from "./traffic-sources-list";

interface MetricWithGrowth {
  value: number;
  previousValue: number;
  growthPercent: number | null;
}

interface VendorEarningsRow {
  storeId: string;
  storeName: string;
  vendorId: string;
  periodRevenue: number;
  previousPeriodRevenue: number;
  growthPercent: number | null;
  periodOrders: number;
  allTimeRevenue: number;
}

interface AnalyticsData {
  range: { start: string | null; end: string; hasComparison: boolean };
  totals: {
    revenue: MetricWithGrowth;
    orders: MetricWithGrowth;
    visits: MetricWithGrowth;
    newVendors: MetricWithGrowth;
    newCustomers: MetricWithGrowth;
    conversionRate: number | null;
  };
  dailyTrend: (RevenueTrendPoint & { newVendors: number; newCustomers: number })[];
  trafficSources: TrafficSourceRow[];
  topVendors: VendorEarningsRow[];
}

function GrowthBadge({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span className="text-[11px]" style={{ color: "var(--atlas-text-muted)" }}>
        —
      </span>
    );
  }
  const isUp = percent >= 0;
  return (
    <span
      className="text-[11px] font-medium"
      style={{ color: isUp ? "var(--atlas-signal)" : "var(--atlas-danger)" }}
    >
      {isUp ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

function StatCard({ label, value, metric }: { label: string; value: string; metric: MetricWithGrowth }) {
  return (
    <div className="atlas-panel p-4">
      <p className="atlas-kicker">{label}</p>
      <p className="atlas-figure mt-1 text-[20px] font-medium">{value}</p>
      <div className="mt-1">
        <GrowthBadge percent={metric.growthPercent} />
      </div>
    </div>
  );
}

export function AnalyticsPanel() {
  const [range, setRange] = useState<DateRangeValue>({ preset: "30d" });
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ range: range.preset });
    if (range.preset === "custom" && range.from && range.to) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    fetch(`/api/admin-console/analytics?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load analytics."))
      .finally(() => setIsLoading(false));
  }, [range]);

  return (
    <div className="space-y-8">
      <DateRangePicker value={range} onChange={setRange} />

      {error ? (
        <p className="atlas-badge" data-tone="danger" style={{ display: "block", padding: "8px 10px" }}>
          {error}
        </p>
      ) : null}

      {!data ? (
        <p style={{ color: "var(--atlas-text-muted)" }}>{isLoading ? "Loading…" : ""}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Revenue" value={formatNaira(data.totals.revenue.value)} metric={data.totals.revenue} />
            <StatCard label="Orders" value={String(data.totals.orders.value)} metric={data.totals.orders} />
            <StatCard label="Visits" value={String(data.totals.visits.value)} metric={data.totals.visits} />
            <div className="atlas-panel p-4">
              <p className="atlas-kicker">Conversion</p>
              <p className="atlas-figure mt-1 text-[20px] font-medium">
                {data.totals.conversionRate !== null ? `${data.totals.conversionRate.toFixed(2)}%` : "—"}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--atlas-text-muted)" }}>
                orders ÷ visits
              </p>
            </div>
            <StatCard label="New vendors" value={String(data.totals.newVendors.value)} metric={data.totals.newVendors} />
            <StatCard
              label="New customers"
              value={String(data.totals.newCustomers.value)}
              metric={data.totals.newCustomers}
            />
          </div>

          {!data.range.hasComparison ? (
            <p className="text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              Growth badges need a comparable previous period — pick anything other than &quot;All
              time&quot; to see them.
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <p className="atlas-kicker mb-2">Revenue vs visits</p>
              <div className="atlas-panel p-4">
                <RevenueTrendChart data={data.dailyTrend} />
              </div>
            </section>

            <section>
              <p className="atlas-kicker mb-2">Traffic sources</p>
              <div className="atlas-panel overflow-hidden">
                <TrafficSourcesList sources={data.trafficSources} />
              </div>
            </section>
          </div>

          <section>
            <p className="atlas-kicker mb-2">New signups</p>
            <div className="atlas-panel p-4">
              <SignupsTrendChart data={data.dailyTrend} />
            </div>
          </section>

          <section>
            <p className="atlas-kicker mb-2">Top vendors by revenue, this period</p>
            <div className="atlas-panel overflow-hidden">
              <table className="atlas-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Period revenue</th>
                    <th>vs previous</th>
                    <th>Orders</th>
                    <th>All-time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.topVendors.map((vendor) => (
                    <tr key={vendor.storeId}>
                      <td>{vendor.storeName}</td>
                      <td className="atlas-figure">{formatNaira(vendor.periodRevenue)}</td>
                      <td>
                        <GrowthBadge percent={vendor.growthPercent} />
                      </td>
                      <td className="atlas-figure">{vendor.periodOrders}</td>
                      <td className="atlas-figure">{formatNaira(vendor.allTimeRevenue)}</td>
                      <td className="text-right">
                        <Link
                          href={`/admin-console/orders?store=${encodeURIComponent(vendor.storeName)}`}
                          className="atlas-btn"
                          data-variant="outline"
                        >
                          View orders
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {data.topVendors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center" style={{ color: "var(--atlas-text-muted)" }}>
                        No completed orders in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}