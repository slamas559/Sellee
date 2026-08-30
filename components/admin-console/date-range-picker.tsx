"use client";

import { useState } from "react";

export type RangePreset = "today" | "7d" | "30d" | "90d" | "this_month" | "last_month" | "all" | "custom";

const PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all", label: "All time" },
];

export interface DateRangeValue {
  preset: RangePreset;
  from?: string;
  to?: string;
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const [customFrom, setCustomFrom] = useState(value.from ?? "");
  const [customTo, setCustomTo] = useState(value.to ?? "");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange({ preset: preset.value })}
          className="atlas-btn"
          data-variant={value.preset === preset.value ? "primary" : "outline"}
          style={{ padding: "5px 10px", fontSize: 12 }}
        >
          {preset.label}
        </button>
      ))}

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="atlas-input"
          style={{ width: 140, padding: "5px 8px", fontSize: 12 }}
        />
        <span style={{ color: "var(--atlas-text-muted)", fontSize: 12 }}>to</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="atlas-input"
          style={{ width: 140, padding: "5px 8px", fontSize: 12 }}
        />
        <button
          type="button"
          disabled={!customFrom || !customTo}
          onClick={() => onChange({ preset: "custom", from: customFrom, to: customTo })}
          className="atlas-btn"
          data-variant={value.preset === "custom" ? "primary" : "outline"}
          style={{ padding: "5px 10px", fontSize: 12 }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}