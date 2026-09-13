"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenueChartData = {
  date: string;
  revenue: number;
  orders: number;
};

export function RevenueChart({ data, rangeLabel }: { data: RevenueChartData[]; rangeLabel?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Revenue &amp; Orders</h3>
        <p className="text-sm text-slate-600">{rangeLabel ?? "Selected period"} performance</p>
      </div>
      <div className="h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="revenue-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={24} />
            <YAxis
              yAxisId="revenue"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => `₦${Number(value).toLocaleString("en-NG", { notation: "compact" })}`}
              width={52}
            />
            <YAxis yAxisId="orders" hide />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)" }}
              formatter={(value, name) => name === "Revenue" ? `₦${Number(value).toLocaleString()}` : `${value} orders`}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" strokeWidth={2.5} fill="url(#revenue-gradient)" />
            <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#0ea5e9" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
