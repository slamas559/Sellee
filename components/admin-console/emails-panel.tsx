"use client";

import { useCallback, useEffect, useState } from "react";

type Segment = "all_customers" | "all_vendors" | "verified_vendors" | "niche";

interface Niche {
  id: string;
  name: string;
}

interface Broadcast {
  id: string;
  segment: Segment;
  niche_id: string | null;
  subject: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: "sending" | "completed";
  created_at: string;
}

const SEGMENT_LABELS: Record<Segment, string> = {
  all_customers: "All customers",
  all_vendors: "All vendors",
  verified_vendors: "Verified vendors",
  niche: "Vendors in a niche",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailsPanel() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [segment, setSegment] = useState<Segment>("all_customers");
  const [nicheId, setNicheId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBroadcasts = useCallback(async () => {
    const response = await fetch("/api/admin-console/emails");
    const data = await response.json().catch(() => ({}));
    if (response.ok) setBroadcasts(data.broadcasts ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin-console/catalog")
      .then((r) => r.json())
      .then((data) => setNiches(data.niches ?? []))
      .catch(() => {});
    loadBroadcasts();
  }, [loadBroadcasts]);

  useEffect(() => {
    if (segment === "niche" && !nicheId) {
      setAudienceCount(null);
      return;
    }
    setIsLoadingAudience(true);
    const params = new URLSearchParams({ segment });
    if (segment === "niche") params.set("nicheId", nicheId);
    fetch(`/api/admin-console/emails/audience?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setAudienceCount(data.count ?? 0))
      .catch(() => setAudienceCount(null))
      .finally(() => setIsLoadingAudience(false));
  }, [segment, nicheId]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!window.confirm(`Send this to ${audienceCount ?? "an unknown number of"} recipients?`)) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/admin-console/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          nicheId: segment === "niche" ? nicheId : undefined,
          subject,
          body,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not send.");
        return;
      }
      setMessage(
        `Sent to ${data.sentSoFar} of ${data.recipientCount} so far` +
          (data.remaining > 0 ? ` — ${data.remaining} more queued for the next run.` : "."),
      );
      setSubject("");
      setBody("");
      loadBroadcasts();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <form onSubmit={handleSend} className="atlas-panel space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium">Audience</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              className="atlas-input"
            >
              {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {segment === "niche" ? (
            <div>
              <label className="mb-1 block text-[12px] font-medium">Niche</label>
              <select value={nicheId} onChange={(e) => setNicheId(e.target.value)} className="atlas-input">
                <option value="">Select a niche</option>
                {niches.map((niche) => (
                  <option key={niche.id} value={niche.id}>
                    {niche.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                {isLoadingAudience
                  ? "Counting…"
                  : audienceCount !== null
                    ? `Reaches ${audienceCount} account${audienceCount === 1 ? "" : "s"}`
                    : ""}
              </p>
            </div>
          )}
        </div>

        {segment === "niche" ? (
          <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
            {isLoadingAudience
              ? "Counting…"
              : audienceCount !== null
                ? `Reaches ${audienceCount} account${audienceCount === 1 ? "" : "s"}`
                : "Pick a niche to see how many this reaches."}
          </p>
        ) : null}

        <div>
          <label className="mb-1 block text-[12px] font-medium">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="atlas-input"
            placeholder="What's this about?"
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            className="atlas-input"
            placeholder={"Write your message. Separate paragraphs with a blank line.\nUse {{name}} to insert the recipient's name."}
          />
        </div>

        {error ? (
          <p className="atlas-badge" data-tone="danger" style={{ display: "block", padding: "8px 10px" }}>
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="atlas-badge" data-tone="active" style={{ display: "block", padding: "8px 10px" }}>
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSending || !audienceCount}
          className="atlas-btn"
          data-variant="primary"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>

      <section>
        <p className="atlas-kicker mb-2">Recent broadcasts</p>
        <div className="atlas-panel overflow-hidden">
          <table className="atlas-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Audience</th>
                <th>Progress</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id}>
                  <td>{b.subject}</td>
                  <td>{SEGMENT_LABELS[b.segment]}</td>
                  <td>
                    <span className="atlas-badge" data-tone={b.status === "completed" ? "active" : "warn"}>
                      {b.sent_count}/{b.recipient_count} {b.status === "sending" ? "sending" : "sent"}
                    </span>
                    {b.failed_count > 0 ? (
                      <span className="atlas-badge ml-2" data-tone="danger">
                        {b.failed_count} failed
                      </span>
                    ) : null}
                  </td>
                  <td className="atlas-figure">{formatDateTime(b.created_at)}</td>
                </tr>
              ))}
              {broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center" style={{ color: "var(--atlas-text-muted)" }}>
                    No broadcasts sent yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}