import { SourceIcon, sourceLabel } from "./source-icon";

export interface TrafficSourceRow {
  source: string;
  count: number;
  percentage: number;
}

export function TrafficSourcesList({ sources }: { sources: TrafficSourceRow[] }) {
  if (sources.length === 0) {
    return (
      <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
        No visits recorded in this period.
      </p>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {sources.map((row) => (
        <div key={row.source} className="flex items-center gap-3">
          <div className="flex w-36 shrink-0 items-center gap-2">
            <SourceIcon source={row.source} />
            <span className="text-[12.5px]">{sourceLabel(row.source)}</span>
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--atlas-line)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(row.percentage, 2)}%`, background: "var(--atlas-brass)" }}
            />
          </div>
          <span className="atlas-figure w-16 shrink-0 text-right text-[12px]">{row.percentage.toFixed(1)}%</span>
          <span className="atlas-figure w-14 shrink-0 text-right text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}