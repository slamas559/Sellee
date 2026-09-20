import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorStore, getVendorWhatsAppLinkStatus } from "@/lib/dashboard-data";
import { getMonthlyBroadcastUsage } from "@/lib/broadcasts/quota";
import { getUnifiedBroadcastHistory } from "@/lib/broadcasts/history";
import { getBroadcastSendStats } from "@/lib/broadcasts/stats";
import { BroadcastComposer } from "@/components/dashboard/broadcast-composer";
import { BroadcastHistoryList } from "@/components/dashboard/broadcast-history-list";

export const metadata: Metadata = {
  title: "Broadcasts",
};

export default async function DashboardBroadcastsPage() {
  const session = await getServerSession(authOptions);
  const vendorId = session?.user?.id;

  const store = vendorId ? await getVendorStore(vendorId) : null;

  const [linkStatus, quota, history, stats] = vendorId
    ? await Promise.all([
        getVendorWhatsAppLinkStatus(vendorId),
        getMonthlyBroadcastUsage(vendorId),
        getUnifiedBroadcastHistory(vendorId),
        store ? getBroadcastSendStats(store.id) : Promise.resolve({ last7Days: { sent: 0, failed: 0 } }),
      ])
    : [
        { linked: null, pending_code: null } as Awaited<ReturnType<typeof getVendorWhatsAppLinkStatus>>,
        { used: 0, limit: 5, remaining: 5 },
        [],
        { last7Days: { sent: 0, failed: 0 } },
      ];

  const lastMessage = history[0]?.message ?? null;

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Broadcasts</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Send a broadcast</h1>
            <p className="mt-1 text-sm text-slate-600">
              Message your followers and past customers over WhatsApp, email, or both.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              WhatsApp broadcasts, last 7 days
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">
              {stats.last7Days.sent} sent
              {stats.last7Days.failed > 0 ? (
                <span className="ml-1 font-medium text-rose-600">· {stats.last7Days.failed} failed</span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <BroadcastComposer
        initialQuota={quota}
        whatsappLinked={Boolean(linkStatus.linked?.is_active)}
        lastMessage={lastMessage}
      />

      <BroadcastHistoryList items={history} />
    </section>
  );
}