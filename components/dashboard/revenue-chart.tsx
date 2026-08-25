"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type RevenueChartData = {
  date: string;
  revenue: number;
  orders: number;
};

export function RevenueChart({ data, rangeLabel }: { data: RevenueChartData[]; rangeLabel?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Revenue & Orders</h3>
        <p className="text-sm text-slate-600">{rangeLabel ?? "Selected period"} performance</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            stroke="#64748b"
            style={{ fontSize: "12px" }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#64748b" 
            style={{ fontSize: "12px" }}
            label={{ value: "Revenue (₦)", angle: -90, position: "insideLeft" }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            style={{ fontSize: "12px" }}
            label={{ value: "Orders", angle: 90, position: "insideRight" }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
            }}
            formatter={(value, name) => {
              if (name === "revenue") return `₦${(value as number).toLocaleString()}`;
              return value;
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue (₦)" />
          <Bar yAxisId="right" dataKey="orders" fill="#06b6d4" name="Orders" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
