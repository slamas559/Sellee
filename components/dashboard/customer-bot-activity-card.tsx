import type { VendorCustomerBotActivity } from "@/lib/dashboard-data";

type CustomerBotActivityCardProps = {
  activity: VendorCustomerBotActivity;
};

function maskPhone(phone: string | null) {
  if (!phone) return "Unknown";
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
}

export function CustomerBotActivityCard({ activity }: CustomerBotActivityCardProps) {
  const topCommands = activity.by_command.slice(0, 5);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
        Customer Bot Activity
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
        Interactions for Your Store (Last 7 Days)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Tracks customer bot commands tied to your store via follows, tracking, and cancellation actions.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Events</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{activity.total_last_7d}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Commands</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topCommands.length > 0 ? (
              topCommands.map((item) => (
                <span
                  key={item.command}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {item.command} ({item.count})
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">No customer command activity yet.</span>
            )}
          </div>
        </article>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        {activity.recent.length === 0 ? (
          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No customer events logged for your store yet.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {activity.recent.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {row.command ?? "UNKNOWN"}
                  </p>
                  <p className="text-xs text-slate-500">
                    From: {maskPhone(row.sender_phone)} • {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    row.status === "ok"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {row.status ?? "unknown"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
