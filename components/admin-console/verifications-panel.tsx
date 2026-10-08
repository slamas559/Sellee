"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { VerificationQueueItem } from "@/app/api/admin-console/verifications/route";
import { ID_DOCUMENT_TYPES } from "@/lib/verification-constants";
import { TIER_LABEL } from "@/lib/verification-tier-constants";

type BankChoice = "" | "matched" | "mismatch";

const REJECTION_PRESETS = [
  "ID photo is unclear or cut off",
  "Selfie doesn't show you holding the ID",
  "Name on the ID doesn't match the payout account",
  "ID is expired or not valid",
];

const STATUS_TONE: Record<VerificationQueueItem["status"], string> = {
  pending: "warn",
  approved: "active",
  rejected: "danger",
};

const HINT_COPY: Record<NonNullable<VerificationQueueItem["name_hint"]>, { label: string; tone: string }> = {
  match: { label: "Names look the same", tone: "active" },
  partial: { label: "Names partly match", tone: "warn" },
  mismatch: { label: "Names don't match", tone: "danger" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function documentLabel(type: VerificationQueueItem["document_type"]) {
  return ID_DOCUMENT_TYPES.find((item) => item.value === type)?.label ?? "ID";
}

function ReviewCard({ item, onReviewed }: { item: VerificationQueueItem; onReviewed: () => void }) {
  const [expanded, setExpanded] = useState(item.status === "pending");
  const [docs, setDocs] = useState<{ id_url: string; selfie_url: string } | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [bankChoice, setBankChoice] = useState<BankChoice>(item.name_hint === "match" ? "matched" : "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [holdReason, setHoldReason] = useState("");

  const isPending = item.status === "pending";
  const needsBankChoice = Boolean(item.payout);
  const canApprove = isPending && !busy && (!needsBankChoice || bankChoice !== "");
  const canReject = isPending && !busy && reason.trim().length >= 5;

  async function loadDocs() {
    setDocsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin-console/verifications/${item.id}/documents`, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { id_url?: string; selfie_url?: string; error?: string };
      if (!response.ok || !data.id_url || !data.selfie_url) {
        setError(data.error ?? "Could not load the photos.");
        return;
      }
      setDocs({ id_url: data.id_url, selfie_url: data.selfie_url });
    } catch {
      setError("Network error while loading the photos.");
    } finally {
      setDocsLoading(false);
    }
  }

  async function holdAction(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin-console/verifications/${item.id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update the hold.");
        return;
      }
      setHoldReason("");
      onReviewed();
    } catch {
      setError("Network error while updating the hold.");
    } finally {
      setBusy(false);
    }
  }

  async function badgeAction(body: Record<string, unknown>) {
    if (!item.store) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin-console/verification-badges/${item.store.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update the badge.");
        return;
      }
      setSuspendReason("");
      onReviewed();
    } catch {
      setError("Network error while updating the badge.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin-console/verifications/${item.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save the decision.");
        // A 409 means someone else already decided: refresh the list.
        if (response.status === 409) onReviewed();
        return;
      }
      onReviewed();
    } catch {
      setError("Network error while saving the decision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[13px] font-medium">
            {item.store?.name ?? item.snapshot.store_name ?? "Unknown store"}
          </span>
          {item.store ? (
            <Link
              href={`/v/${item.store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-[11.5px]"
              style={{ color: "var(--atlas-brass-strong)" }}
            >
              View store
            </Link>
          ) : null}
        </div>
        <span className="atlas-badge" data-tone={STATUS_TONE[item.status]}>
          {item.status}
        </span>
      </div>

      <p className="mt-1 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
        {item.vendor?.full_name || item.snapshot.vendor_full_name || "Unknown"} ·{" "}
        {item.vendor?.email ?? item.snapshot.vendor_email ?? "no email"} · submitted {formatDate(item.created_at)}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 text-[11.5px]"
        style={{ color: "var(--atlas-brass-strong)" }}
      >
        {expanded ? "Hide details" : "View details"}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="atlas-panel p-3">
              <p className="atlas-kicker">On the ID</p>
              <p className="mt-1 text-[13px] font-medium">{item.id_full_name ?? "—"}</p>
              <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                {documentLabel(item.document_type)}
              </p>
            </div>
            <div className="atlas-panel p-3">
              <p className="atlas-kicker">Payout account</p>
              {item.payout ? (
                <>
                  <p className="mt-1 text-[13px] font-medium">{item.payout.resolved_account_name}</p>
                  <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                    {item.payout.bank_name} · ••••{item.payout.account_last4}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                  No payout account added yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.name_hint ? (
              <span className="atlas-badge" data-tone={HINT_COPY[item.name_hint].tone}>
                {HINT_COPY[item.name_hint].label}
              </span>
            ) : null}
            {item.payout && item.payout.shared_with_other_stores > 0 ? (
              <span className="atlas-badge" data-tone="danger">
                Same bank account on {item.payout.shared_with_other_stores} other store
                {item.payout.shared_with_other_stores > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {item.retention.photos_purged ? (
            <p className="text-[12.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              The ID photos for this record were deleted under the retention schedule. The details above are kept.
            </p>
          ) : docs ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { label: "ID photo", url: docs.id_url },
                { label: "Selfie with ID", url: docs.selfie_url },
              ] as const).map((photo) => (
                <div key={photo.label}>
                  <p className="atlas-kicker mb-1">{photo.label}</p>
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="max-h-80 w-full rounded-sm border object-contain"
                      style={{ borderColor: "var(--atlas-line)", background: "var(--atlas-paper-raised)" }}
                    />
                  </a>
                </div>
              ))}
              <p className="text-[11px] sm:col-span-2" style={{ color: "var(--atlas-text-muted)" }}>
                Links expire after a few minutes. Reload the photos if they stop showing.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={loadDocs}
              disabled={docsLoading}
              className="atlas-btn"
              data-variant="outline"
              style={{ padding: "5px 12px", fontSize: 12 }}
            >
              {docsLoading ? "Loading photos..." : "Load ID photos"}
            </button>
          )}

          <div className="space-y-2 text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
            {item.retention.account_deleted ? (
              <span className="atlas-badge" data-tone="warn">
                Account deleted
              </span>
            ) : null}
            {!item.retention.photos_purged && item.retention.purge_at ? (
              <p>
                Photos are scheduled for deletion on {formatDate(item.retention.purge_at)}
                {item.retention.hold ? " (paused by a hold)" : ""}.
              </p>
            ) : null}
            {item.retention.hold ? (
              <div className="space-y-1">
                <p>Held{item.retention.hold_reason ? `: ${item.retention.hold_reason}` : "."}</p>
                <button
                  type="button"
                  onClick={() => holdAction({ hold: false })}
                  disabled={busy}
                  className="atlas-btn"
                  data-variant="outline"
                  style={{ padding: "4px 10px", fontSize: 11.5 }}
                >
                  Release hold
                </button>
              </div>
            ) : !item.retention.photos_purged ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={holdReason}
                  onChange={(event) => setHoldReason(event.target.value)}
                  placeholder="Reason to keep these photos (investigation, dispute...)"
                  maxLength={300}
                  disabled={busy}
                  className="atlas-input"
                  style={{ maxWidth: 360 }}
                />
                <button
                  type="button"
                  onClick={() => holdAction({ hold: true, reason: holdReason })}
                  disabled={busy || holdReason.trim().length < 5}
                  className="atlas-btn"
                  data-variant="outline"
                  style={{ padding: "4px 10px", fontSize: 11.5 }}
                >
                  Hold photos
                </button>
              </div>
            ) : null}
          </div>

          {!isPending && item.status === "rejected" && item.rejection_reason ? (
            <p className="text-[12.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              Rejected{item.reviewed_at ? ` on ${formatDate(item.reviewed_at)}` : ""}: {item.rejection_reason}
            </p>
          ) : null}
          {!isPending && item.status === "approved" ? (
            <p className="text-[12.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              Approved{item.reviewed_at ? ` on ${formatDate(item.reviewed_at)}` : ""}.
              {item.payout ? ` Bank name check: ${item.payout.name_match_status}.` : ""}
            </p>
          ) : null}

          {item.status === "approved" && item.badge ? (
            <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--atlas-line)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="atlas-kicker">Store badge</p>
                <span
                  className="atlas-badge"
                  data-tone={item.badge.suspended ? "danger" : item.badge.tier === "none" ? "neutral" : "active"}
                >
                  {item.badge.suspended ? "Suspended" : TIER_LABEL[item.badge.tier]}
                </span>
              </div>
              {item.badge.suspended ? (
                <>
                  {item.badge.suspended_reason ? (
                    <p className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
                      Reason: {item.badge.suspended_reason}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => badgeAction({ action: "reinstate" })}
                    disabled={busy}
                    className="atlas-btn"
                    data-variant="outline"
                    style={{ padding: "4px 10px", fontSize: 11.5 }}
                  >
                    Reinstate badge
                  </button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={suspendReason}
                    onChange={(event) => setSuspendReason(event.target.value)}
                    placeholder="Reason for suspending the badge"
                    maxLength={300}
                    disabled={busy}
                    className="atlas-input"
                    style={{ maxWidth: 320 }}
                  />
                  <button
                    type="button"
                    onClick={() => badgeAction({ action: "suspend", reason: suspendReason })}
                    disabled={busy || suspendReason.trim().length < 5}
                    className="atlas-btn"
                    data-variant="danger"
                    style={{ padding: "4px 10px", fontSize: 11.5 }}
                  >
                    Suspend badge
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {isPending ? (
            <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--atlas-line)" }}>
              {item.payout ? (
                <fieldset>
                  <legend className="atlas-kicker mb-1">Does the payout account name match the ID?</legend>
                  <div className="flex flex-wrap gap-4 text-[12.5px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`bank-${item.id}`}
                        checked={bankChoice === "matched"}
                        onChange={() => setBankChoice("matched")}
                        disabled={busy}
                      />
                      Yes, it matches
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`bank-${item.id}`}
                        checked={bankChoice === "mismatch"}
                        onChange={() => setBankChoice("mismatch")}
                        disabled={busy}
                      />
                      No, it doesn&apos;t
                    </label>
                  </div>
                </fieldset>
              ) : null}

              <div>
                <button
                  type="button"
                  onClick={() => submit({ decision: "approve", ...(item.payout ? { bank_name_match: bankChoice } : {}) })}
                  disabled={!canApprove}
                  className="atlas-btn"
                  data-variant="primary"
                >
                  {busy ? "Saving..." : "Approve ID"}
                </button>
                {item.payout && bankChoice === "" ? (
                  <span className="ml-3 text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
                    Choose a bank name answer first.
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="atlas-kicker">Or reject with a reason the vendor will see</p>
                <div className="flex flex-wrap gap-2">
                  {REJECTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      disabled={busy}
                      className="atlas-btn"
                      data-variant="outline"
                      style={{ padding: "3px 9px", fontSize: 11.5 }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Reason for rejection"
                  disabled={busy}
                  className="atlas-input"
                />
                <button
                  type="button"
                  onClick={() => submit({ decision: "reject", reason })}
                  disabled={!canReject}
                  className="atlas-btn"
                  data-variant="danger"
                >
                  {busy ? "Saving..." : "Reject"}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-[12.5px]" style={{ color: "var(--atlas-danger, #b42318)" }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function VerificationsPanel() {
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  // null = not loaded yet for the current filter.
  const [items, setItems] = useState<VerificationQueueItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Bumped after a review so the list refetches.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin-console/verifications?status=${status}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { items?: VerificationQueueItem[]; error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(data.error ?? "Could not load verifications.");
          return;
        }
        setLoadError(null);
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Network error while loading verifications.");
      });

    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="atlas-kicker">ID submissions</p>
        <select
          value={status}
          onChange={(event) => {
            setItems(null);
            setLoadError(null);
            setStatus(event.target.value);
          }}
          className="atlas-input w-auto"
          style={{ fontSize: 12 }}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="atlas-panel divide-y" style={{ borderColor: "var(--atlas-line)" }}>
        {(items ?? []).map((item) => (
          <ReviewCard key={item.id} item={item} onReviewed={() => {
              setReloadKey((value) => value + 1);
              // Refresh the layout too, so the sidebar count stays right.
              router.refresh();
            }} />
        ))}
        {items !== null && items.length === 0 ? (
          <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            Nothing here.
          </p>
        ) : null}
        {items === null && !loadError ? (
          <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            Loading...
          </p>
        ) : null}
        {loadError ? (
          <p className="p-4 text-center text-[13px]" style={{ color: "var(--atlas-text-muted)" }}>
            {loadError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
