"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type OrderStatusData = {
  status: string;
  count: number;
  fill: string;
};

export function OrderStatusChart({ data }: { data: OrderStatusData[] }) {
  const totalOrders = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Order Status Distribution</h3>
        <p className="text-sm text-slate-600">Current order breakdown</p>
      </div>
      <div className="relative h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="78%"
              paddingAngle={3}
              cornerRadius={6}
              dataKey="count"
              stroke="none"
            >
              {data.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)" }}
              formatter={(value) => `${value} orders`}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums text-slate-900">{totalOrders}</span>
          <span className="text-xs font-medium text-slate-500">Total orders</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
        {data.map((item) => (
          <div key={item.status} className="flex min-w-0 items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="truncate capitalize">{item.status}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
