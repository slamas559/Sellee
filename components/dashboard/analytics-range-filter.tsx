"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { RANGE_OPTIONS, type AnalyticsRangeKey } from "@/lib/date-range";

function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function AnalyticsRangeFilter({
  active,
  customFrom,
  customTo,
}: {
  active: AnalyticsRangeKey;
  /** Current custom-range bounds as ISO strings, if the active range is "custom". */
  customFrom?: string | null;
  customTo?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showCustom, setShowCustom] = useState(active === "custom");
  const [fromInput, setFromInput] = useState(toDateInputValue(customFrom));
  const [toInput, setToInput] = useState(toDateInputValue(customTo));

  function navigateToRange(key: AnalyticsRangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSelect(key: AnalyticsRangeKey) {
    if (key === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    navigateToRange(key);
  }

  function applyCustomRange() {
    if (!fromInput || !toInput) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", fromInput);
    params.set("to", toInput);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full sm:w-auto">
      {/* Mobile: dropdown */}
      <select
        value={active}
        onChange={(e) => handleSelect(e.target.value as AnalyticsRangeKey)}
        className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 sm:hidden"
      >
        {RANGE_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Desktop: pills */}
      <div className="hidden flex-wrap gap-2 sm:flex">
        {RANGE_OPTIONS.map((option) => {
          const isActive = option.key === active;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSelect(option.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <label className="flex flex-col text-xs text-slate-500">
            From
            <input
              type="date"
              value={fromInput}
              max={toInput || undefined}
              onChange={(e) => setFromInput(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            To
            <input
              type="date"
              value={toInput}
              min={fromInput || undefined}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setToInput(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800"
            />
          </label>
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={!fromInput || !toInput}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}