import type { VendorOutboundBotTrends } from "@/lib/dashboard-data";

type OutboundBotTrendsCardProps = {
  trends: VendorOutboundBotTrends;
};

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function pct(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

export function OutboundBotTrendsCard({ trends }: OutboundBotTrendsCardProps) {
  const maxDaily =
    trends.daily.reduce((max, row) => Math.max(max, row.success + row.failed), 0) || 1;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Outbound Delivery
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-900">
            7-Day WhatsApp Trend
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {trends.total_last_7d} sends
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-xs text-slate-600">Success</p>
          <p className="mt-1 text-xl font-black text-emerald-700">{trends.success_count}</p>
          <p className="text-xs text-slate-500">
            {pct(trends.success_count, trends.total_last_7d)}%
          </p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
          <p className="text-xs text-slate-600">Failed</p>
          <p className="mt-1 text-xl font-black text-rose-700">{trends.failed_count}</p>
          <p className="text-xs text-slate-500">
            {pct(trends.failed_count, trends.total_last_7d)}%
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {trends.daily.length > 0 ? (
          trends.daily.map((row) => {
            const total = row.success + row.failed;
            const width = Math.max(6, Math.round((total / maxDaily) * 100));

            return (
              <div key={row.date} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{dayFormatter.format(new Date(row.date))}</span>
                  <span>
                    {row.success} ok / {row.failed} fail
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100">
                  <div
                    className="flex h-full overflow-hidden rounded-full"
                    style={{ width: `${width}%` }}
                  >
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct(row.success, total)}%` }}
                    />
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${pct(row.failed, total)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">
            No outbound sends in the last 7 days yet.
          </p>
        )}
      </div>

      {trends.by_command.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {trends.by_command.slice(0, 4).map((item) => (
            <span
              key={item.command}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              {item.command}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
