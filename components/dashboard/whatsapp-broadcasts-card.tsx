"use client";

import { useMemo, useState } from "react";
import type { VendorBroadcastHistoryItem } from "@/lib/dashboard-data";

type WhatsAppBroadcastsCardProps = {
  initialBroadcasts: VendorBroadcastHistoryItem[];
};

type ApiHistoryResponse = {
  error?: string;
  broadcasts?: VendorBroadcastHistoryItem[];
};

type ApiCreateResponse = {
  error?: string;
  mode?: "now" | "schedule";
  result?: {
    broadcastId?: string;
    targetCount?: number;
    sentCount?: number;
    failedCount?: number;
    status?: string;
    scheduledAt?: string;
  };
};

type HistoryFilter = "all" | "sent" | "scheduled" | "failed";

function statusClass(status: string) {
  if (status === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "scheduled") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "sending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function WhatsAppBroadcastsCard({ initialBroadcasts }: WhatsAppBroadcastsCardProps) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [message, setMessage] = useState("");
  const [targetScope, setTargetScope] = useState<"followers" | "customers" | "all">("followers");
  const [scheduledAt, setScheduledAt] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const messageLength = message.trim().length;
  const canSubmit = messageLength >= 3;

  const totals = useMemo(
    () =>
      broadcasts.reduce(
        (acc, row) => {
          acc.sent += Number(row.sent_count ?? 0);
          acc.failed += Number(row.failed_count ?? 0);
          return acc;
        },
        { sent: 0, failed: 0 },
      ),
    [broadcasts],
  );

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return broadcasts;
    return broadcasts.filter((item) => item.status === historyFilter);
  }, [broadcasts, historyFilter]);

  const lastCampaignMessage = useMemo(() => {
    const first = broadcasts[0];
    return first?.message?.trim() ?? "";
  }, [broadcasts]);

  async function refreshHistory() {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/vendor/broadcasts", { cache: "no-store" });
      const payload = (await response.json()) as ApiHistoryResponse;
      if (!response.ok) {
        setError(payload.error ?? "Could not load broadcast history.");
        return;
      }
      setBroadcasts(payload.broadcasts ?? []);
    } catch {
      setError("Network error while loading broadcast history.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function sendNow() {
    if (!canSubmit) return;
    setIsSendingNow(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/vendor/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "now",
          message: message.trim(),
          target_scope: targetScope,
        }),
      });
      const payload = (await response.json()) as ApiCreateResponse;
      if (!response.ok) {
        setError(payload.error ?? "Could not send broadcast.");
        return;
      }

      setNotice(
        `Broadcast sent. Delivered: ${payload.result?.sentCount ?? 0}, Failed: ${
          payload.result?.failedCount ?? 0
        }.`,
      );
      setMessage("");
      await refreshHistory();
    } catch {
      setError("Network error while sending broadcast.");
    } finally {
      setIsSendingNow(false);
    }
  }

  async function scheduleNow() {
    if (!canSubmit) return;
    if (!scheduledAt) {
      setError("Pick a date/time before scheduling.");
      return;
    }
    setIsScheduling(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/vendor/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "schedule",
          message: message.trim(),
          target_scope: targetScope,
          scheduled_at: scheduledAt,
        }),
      });
      const payload = (await response.json()) as ApiCreateResponse;
      if (!response.ok) {
        setError(payload.error ?? "Could not schedule broadcast.");
        return;
      }

      setNotice(`Broadcast scheduled for ${payload.result?.scheduledAt ?? "your selected time"}.`);
      setMessage("");
      setScheduledAt("");
      await refreshHistory();
    } catch {
      setError("Network error while scheduling broadcast.");
    } finally {
      setIsScheduling(false);
    }
  }

  function copyLastCampaign() {
    if (!lastCampaignMessage) return;
    setMessage(lastCampaignMessage);
    setNotice("Copied last campaign into the message box.");
    setError(null);
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Broadcast Campaigns
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
            Send Promotions from Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Create a campaign now or schedule it for later. Target followers, past customers, or both.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshHistory()}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
        >
          {isRefreshing ? "Refreshing..." : "Refresh History"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Campaigns</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{broadcasts.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivered</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{totals.sent}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failed</p>
          <p className="mt-1 text-2xl font-black text-rose-700">{totals.failed}</p>
        </article>
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <label className="text-sm font-semibold text-slate-800">Broadcast Message</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Example: Flash sale today - 10% off all items until 6PM."
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-300 transition focus:ring-2"
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{messageLength}/1000 characters</p>
            <button
              type="button"
              onClick={copyLastCampaign}
              disabled={!lastCampaignMessage}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy Last Campaign
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-800">Audience</span>
            <select
              value={targetScope}
              onChange={(event) =>
                setTargetScope(event.target.value as "followers" | "customers" | "all")
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-300 transition focus:ring-2"
            >
              <option value="followers">Followers only</option>
              <option value="customers">Past customers only</option>
              <option value="all">Followers + past customers</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-800">Schedule Time (Optional)</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-300 transition focus:ring-2"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => void sendNow()}
            disabled={!canSubmit || isSendingNow}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
          >
            {isSendingNow ? "Sending..." : "Send Broadcast Now"}
          </button>
          <button
            type="button"
            onClick={() => void scheduleNow()}
            disabled={!canSubmit || isScheduling}
            className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-60 sm:text-sm"
          >
            {isScheduling ? "Scheduling..." : "Schedule Broadcast"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Recent Campaigns</h3>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "sent", "scheduled", "failed"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setHistoryFilter(filter)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  historyFilter === filter
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        {filteredHistory.length === 0 ? (
          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No {historyFilter === "all" ? "" : historyFilter} campaigns found.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {filteredHistory.slice(0, 12).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    #{shortId(item.id)} • {item.target_scope}
                  </p>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-700">{item.message}</p>
                <p className="mt-1.5 text-xs text-slate-500">
                  Sent: {item.sent_count} • Failed: {item.failed_count} •{" "}
                  {item.scheduled_at
                    ? `Scheduled ${new Date(item.scheduled_at).toLocaleString()}`
                    : item.sent_at
                      ? `Sent ${new Date(item.sent_at).toLocaleString()}`
                      : `Created ${new Date(item.created_at).toLocaleString()}`}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

