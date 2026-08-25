"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type VisitsChartData = {
  date: string;
  visits: number;
  uniqueVisitors: number;
};

export function VisitsChart({ data, rangeLabel }: { data: VisitsChartData[]; rangeLabel?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Store Traffic</h3>
        <p className="text-sm text-slate-600">{rangeLabel ?? "Selected period"} store visits</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
          <YAxis stroke="#64748b" style={{ fontSize: "12px" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="visits"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.2}
            name="Visits"
          />
          <Area
            type="monotone"
            dataKey="uniqueVisitors"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.25}
            name="Unique Visitors"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}