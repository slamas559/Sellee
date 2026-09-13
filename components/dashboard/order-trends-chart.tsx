"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendData = {
  date: string;
  confirmed: number;
  pending: number;
  delivered: number;
};

export function OrderTrendsChart({ data }: { data: TrendData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Order Trends</h3>
        <p className="text-sm text-slate-600">How each order status moves over time</p>
      </div>
      <div className="h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="confirmed-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.26} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="pending-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="delivered-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} width={28} />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)" }}
              formatter={(value, name) => [`${value} orders`, name]}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area type="monotone" dataKey="confirmed" name="Confirmed" stroke="#059669" strokeWidth={2.25} fill="url(#confirmed-gradient)" />
            <Area type="monotone" dataKey="pending" name="Pending" stroke="#d97706" strokeWidth={2.25} fill="url(#pending-gradient)" />
            <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#0284c7" strokeWidth={2.25} fill="url(#delivered-gradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
