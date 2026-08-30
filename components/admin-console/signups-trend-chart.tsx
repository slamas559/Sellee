"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface SignupTrendPoint {
  date: string;
  newVendors: number;
  newCustomers: number;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SignupsTrendChart({ data }: { data: SignupTrendPoint[] }) {
  const chartData = data.map((point) => ({ ...point, label: formatShortDate(point.date) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ddd9cd" vertical={false} />
        <XAxis dataKey="label" stroke="#6b6559" style={{ fontSize: 10.5 }} interval="preserveStartEnd" />
        <YAxis stroke="#6b6559" style={{ fontSize: 10.5 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#f8f7f3", border: "1px solid #ddd9cd", borderRadius: 3, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Bar dataKey="newVendors" name="New vendors" fill="#b1802f" stackId="signups" radius={[0, 0, 0, 0]} />
        <Bar dataKey="newCustomers" name="New customers" fill="#3f6657" stackId="signups" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}