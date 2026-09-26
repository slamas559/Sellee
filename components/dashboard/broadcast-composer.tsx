"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { AiRefineButton } from "@/components/ai/ai-refine-button";
import type { BroadcastQuota } from "@/lib/broadcasts/quota";

type Channel = "whatsapp" | "email";
type TargetScope = "followers" | "customers" | "all";

interface BroadcastComposerProps {
  initialQuota: BroadcastQuota;
  whatsappLinked: boolean;
  lastMessage: string | null;
}

interface SendResult {
  whatsapp?: { sentCount: number; failedCount: number; targetCount: number };
  email?: { recipientCount: number; firstBatchSent: number; firstBatchFailed: number; isFallback: boolean };
}

export function BroadcastComposer({ initialQuota, whatsappLinked, lastMessage }: BroadcastComposerProps) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>(whatsappLinked ? ["whatsapp"] : ["email"]);
  const [message, setMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [targetScope, setTargetScope] = useState<TargetScope>("followers");
  const [quota, setQuota] = useState(initialQuota);
  const [isSending, setIsSending] = useState(false);
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    setQuota(initialQuota);
  }, [initialQuota]);

  const messageLength = message.length;
  const canSendWhatsApp = whatsappLinked;
  const includesEmail = channels.includes("email");
  const includesWhatsApp = channels.includes("whatsapp");
  // Scheduling only makes sense for a WhatsApp-only send right now - the
  // fallback logic needs to know WhatsApp's actual delivery results before
  // it can decide who needs a fallback email, which isn't knowable ahead of
  // a scheduled send time. So scheduling + email together isn't offered.
  const canSchedule = includesWhatsApp && !includesEmail;
  const canSend = useMemo(
    () =>
      message.trim().length >= 3 &&
      channels.length > 0 &&
      (!includesEmail || emailSubject.trim().length > 0) &&
      (!isScheduleMode || Boolean(scheduledAt)) &&
      quota.remaining > 0 &&
      !isSending,
    [message, channels, includesEmail, emailSubject, isScheduleMode, scheduledAt, quota.remaining, isSending],
  );

  function toggleChannel(channel: Channel) {
    setChannels((prev) => {
      const next = prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel];
      if (next.includes("email") && next.includes("whatsapp")) {
        setIsScheduleMode(false);
      }
      return next;
    });
    setResult(null);
  }

  async function handleSend() {
    setIsSending(true);
    setError(null);
    setResult(null);
    setScheduleNotice(null);
    try {
      if (isScheduleMode && canSchedule) {
        // Reuses the existing WhatsApp-only scheduling endpoint - this
        // predates the multi-channel composer and still works as-is, so
        // there was no reason to rebuild it.
        const response = await fetch("/api/vendor/broadcasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "schedule",
            message: message.trim(),
            target_scope: targetScope,
            // Converted via the browser's own timezone before sending, so
            // the naive datetime-local value maps to the correct UTC
            // instant regardless of what timezone the server runs in.
            scheduled_at: new Date(scheduledAt).toISOString(),
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(payload?.error ?? "Could not schedule broadcast.");
          return;
        }
        setScheduleNotice(
          `Broadcast scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
        );
        setMessage("");
        setScheduledAt("");
        setIsScheduleMode(false);
        router.refresh();
        return;
      }

      const response = await fetch("/api/vendor/broadcasts/send-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          email_subject: includesEmail ? emailSubject.trim() : undefined,
          target_scope: targetScope,
          channels,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Could not send broadcast.");
        return;
      }
      setResult(payload.result);
      setQuota(payload.quota);
      setMessage("");
      setEmailSubject("");
      router.refresh();
    } catch {
      setError("Network error while sending. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">New broadcast</h2>
          <p className="mt-0.5 text-sm text-slate-500">Reach your followers and past customers in one send.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="text-xs font-semibold text-slate-600">
            {quota.unlimited ? "Unlimited this month" : `${quota.remaining} of ${quota.limit} left this month`}
          </span>
        </div>
      </div>

      {/* Channel selection */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Send via</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => canSendWhatsApp && toggleChannel("whatsapp")}
            disabled={!canSendWhatsApp}
            title={!canSendWhatsApp ? "Link your WhatsApp bot number in Integrations first." : undefined}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              includesWhatsApp
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            type="button"
            onClick={() => toggleChannel("email")}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
              includesEmail
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>
        {includesWhatsApp && includesEmail ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            WhatsApp only reaches customers who&apos;ve messaged your bot in the last 24 hours. Anyone outside that
            window gets an email automatically — no one is messaged twice.
          </p>
        ) : includesWhatsApp ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Only reaches customers who&apos;ve messaged your bot in the last 24 hours. Add email to cover everyone
            else automatically.
          </p>
        ) : null}
      </div>

      {/* Audience */}
      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="broadcast-audience">
          Audience
        </label>
        <select
          id="broadcast-audience"
          value={targetScope}
          onChange={(event) => setTargetScope(event.target.value as TargetScope)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none sm:max-w-xs"
        >
          <option value="followers">Followers</option>
          <option value="customers">Past customers</option>
          <option value="all">Followers + past customers</option>
        </select>
      </div>

      {/* Email subject, only when relevant */}
      {includesEmail ? (
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="broadcast-subject">
            Email subject
          </label>
          <input
            id="broadcast-subject"
            type="text"
            value={emailSubject}
            onChange={(event) => setEmailSubject(event.target.value)}
            maxLength={200}
            placeholder="e.g. Flash sale — 10% off today only"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      ) : null}

      {/* Message */}
      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="broadcast-message">
          Message
        </label>
        <textarea
          id="broadcast-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          rows={5}
          placeholder="Example: Flash sale today — 10% off all items until 6PM."
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <AiRefineButton value={message} kind="broadcast_message" onApply={setMessage} />
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">{messageLength}/1000 characters</p>
            {lastMessage ? (
              <button
                type="button"
                onClick={() => setMessage(lastMessage)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Copy last campaign
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Scheduling — WhatsApp-only, see canSchedule comment above */}
      {canSchedule ? (
        <div className="mt-5 rounded-lg border border-slate-200 p-3.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isScheduleMode}
              onChange={(event) => setIsScheduleMode(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Schedule for later instead of sending now
          </label>
          {isScheduleMode ? (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none sm:max-w-xs"
            />
          ) : null}
        </div>
      ) : includesEmail ? (
        <p className="mt-5 text-xs text-slate-500">
          Scheduling isn&apos;t available when email is included — send it now, or switch to WhatsApp-only to
          schedule for later.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={!canSend}
        className="mt-5 w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSending ? (isScheduleMode ? "Scheduling…" : "Sending…") : isScheduleMode ? "Schedule broadcast" : "Send broadcast now"}
      </button>

      {quota.remaining <= 0 ? (
        <p className="mt-3 text-xs font-medium text-amber-700">
          You&apos;ve used all {quota.limit} broadcasts this month. Quota resets next month.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {scheduleNotice ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {scheduleNotice}
        </p>
      ) : null}
      {result ? (
        <div className="mt-3 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {result.whatsapp ? (
            <p>
              WhatsApp: sent to {result.whatsapp.sentCount} of {result.whatsapp.targetCount}.
            </p>
          ) : null}
          {result.email ? (
            <p>
              Email{result.email.isFallback ? " (fallback for unreached WhatsApp recipients)" : ""}: queued for{" "}
              {result.email.recipientCount} of {result.email.firstBatchSent} sent so far.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}