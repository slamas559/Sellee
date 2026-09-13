"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type VisitsChartData = {
  date: string;
  visits: number;
  uniqueVisitors: number;
};

export function VisitsChart({ data, rangeLabel }: { data: VisitsChartData[]; rangeLabel?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Store Traffic</h3>
        <p className="text-sm text-slate-600">{rangeLabel ?? "Selected period"} store visits</p>
      </div>
      <div className="h-[240px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="visits-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="visitors-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} width={28} />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)" }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area type="monotone" dataKey="visits" name="Visits" stroke="#0284c7" strokeWidth={2.25} fill="url(#visits-gradient)" />
            <Area type="monotone" dataKey="uniqueVisitors" name="Unique visitors" stroke="#059669" strokeWidth={2.25} fill="url(#visitors-gradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
