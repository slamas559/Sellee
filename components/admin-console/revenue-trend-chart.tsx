"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNaira } from "@/lib/format";

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
  visits: number;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Revenue (bars) plotted against visits (line) on a secondary axis - the
 * combination that actually answers "is traffic converting to money", not
 * just "how much traffic" or "how much revenue" in isolation.
 */
export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  const chartData = data.map((point) => ({ ...point, label: formatShortDate(point.date) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ddd9cd" vertical={false} />
        <XAxis dataKey="label" stroke="#6b6559" style={{ fontSize: 10.5 }} interval="preserveStartEnd" />
        <YAxis
          yAxisId="revenue"
          stroke="#6b6559"
          style={{ fontSize: 10.5 }}
          tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
        />
        <YAxis yAxisId="visits" orientation="right" stroke="#6b6559" style={{ fontSize: 10.5 }} />
        <Tooltip
          contentStyle={{
            background: "#f8f7f3",
            border: "1px solid #ddd9cd",
            borderRadius: 3,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            if (name === "revenue") return [formatNaira(Number(value ?? 0)), "Revenue"];
            if (name === "visits") return [value, "Visits"];
            return [value, "Orders"];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Bar yAxisId="revenue" dataKey="revenue" fill="#b1802f" name="revenue" radius={[2, 2, 0, 0]} />
        <Line
          yAxisId="visits"
          type="monotone"
          dataKey="visits"
          name="visits"
          stroke="#3f6657"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}