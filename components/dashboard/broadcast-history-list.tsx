"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import type { UnifiedBroadcastItem } from "@/lib/broadcasts/history";

type Filter = "all" | "sent" | "scheduled" | "failed";

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

const scopeLabel: Record<string, string> = {
  followers: "Followers",
  customers: "Past customers",
  all: "Followers + past customers",
};

export function BroadcastHistoryList({ items }: { items: UnifiedBroadcastItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = items.filter((item) => (filter === "all" ? true : item.status === filter));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Recent campaigns</h2>
        <div className="flex gap-1.5">
          {(["all", "sent", "scheduled", "failed"] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                filter === option
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No campaigns yet.</p>
        ) : (
          filtered.map((item) => (
            <div key={`${item.channel}-${item.id}`} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {item.channel === "whatsapp" ? (
                    <MessageCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  <span>#{shortId(item.id)}</span>
                  <span>·</span>
                  <span>{scopeLabel[item.targetScope] ?? item.targetScope}</span>
                  {item.fallbackForBroadcastId ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      Fallback for #{shortId(item.fallbackForBroadcastId)}
                    </span>
                  ) : null}
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>

              {item.subject ? <p className="mt-2 text-sm font-semibold text-slate-800">{item.subject}</p> : null}
              <p className="mt-1 line-clamp-2 text-sm text-slate-700">{item.message}</p>

              <p className="mt-2 text-xs text-slate-500">
                {item.status === "scheduled" && item.scheduledAt
                  ? `Scheduled ${new Date(item.scheduledAt).toLocaleString()}`
                  : item.sentAt
                    ? `Sent ${new Date(item.sentAt).toLocaleString()}`
                    : `Created ${new Date(item.createdAt).toLocaleString()}`}
                {" · "}Sent: {item.sentCount} · Failed: {item.failedCount}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}