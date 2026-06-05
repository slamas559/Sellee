"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type ProductPerformanceData = {
  name: string;
  sold: number;
  revenue: number;
};

export function ProductPerformanceChart({ data }: { data: ProductPerformanceData[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top Products</h3>
        <p className="text-sm text-slate-600">Best performing products by revenue</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" style={{ fontSize: "12px" }} />
          <YAxis 
            dataKey="name" 
            type="category"
            stroke="#64748b"
            style={{ fontSize: "12px" }}
            width={140}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
            }}
            formatter={(value) => `₦${(value as number).toLocaleString()}`}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue (₦)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
