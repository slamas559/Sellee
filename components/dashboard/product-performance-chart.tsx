"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ProductPerformanceData = {
  name: string;
  sold: number;
  revenue: number;
};

function compactName(value: string) {
  return value.length > 16 ? `${value.slice(0, 15)}…` : value;
}

export function ProductPerformanceChart({ data }: { data: ProductPerformanceData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top Products</h3>
        <p className="text-sm text-slate-600">Ranked by revenue in this period</p>
      </div>
      <div className="h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 8, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => `₦${Number(value).toLocaleString("en-NG", { notation: "compact" })}`}
            />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 11 }}
              tickFormatter={compactName}
              width={96}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)" }}
              formatter={(value, name) => name === "Revenue" ? `₦${Number(value).toLocaleString()}` : `${value} sold`}
            />
            <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
