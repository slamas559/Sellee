import { BadgeCheck, CircleDashed } from "lucide-react";
import { VerificationPill } from "@/components/store/verification-pill";
import type { TierProgress } from "@/lib/vendor-tier";
import { TIER_LABEL } from "@/lib/verification-tier-constants";

type TierProgressCardProps = {
  progress: TierProgress;
};

export function TierProgressCard({ progress }: TierProgressCardProps) {
  const hidden = progress.suspended || progress.autoSuspended;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black tracking-tight text-slate-900">Your badge</h2>
        {hidden ? (
          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
            Paused
          </span>
        ) : progress.tier === "none" ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            Not verified yet
          </span>
        ) : (
          <VerificationPill tier={progress.tier} />
        )}
      </div>

      {progress.suspended ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Your badge has been suspended by our team
          {progress.suspendedReason ? `: ${progress.suspendedReason}` : "."} Contact support if you think this is a mistake.
        </p>
      ) : progress.autoSuspended ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Your badge is paused because several of your product listings were reported and actioned in the last 90 days.
          It can return once those reports age out.
        </p>
      ) : null}

      {!hidden && progress.cappedByReports && progress.tier !== "none" ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A product listing of yours was reported and actioned in the last 90 days, so you can&apos;t move above
          Verified until it ages out.
        </p>
      ) : null}

      {!hidden && progress.tier === "none" ? (
        <p className="mt-3 text-sm text-slate-600">
          {progress.identityComplete
            ? "All your checks are done. Your badge will appear shortly."
            : "Finish the checklist above to earn your Verified badge."}
        </p>
      ) : null}

      {!hidden && progress.nextTier ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-900">Next: {TIER_LABEL[progress.nextTier]}</p>
          <ul className="mt-3 space-y-2">
            {progress.requirements.map((requirement) => (
              <li key={requirement.label} className="flex items-center gap-2 text-sm">
                {requirement.met ? (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <CircleDashed className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                )}
                <span className="flex-1 text-slate-700">{requirement.label}</span>
                <span className={requirement.met ? "font-semibold text-emerald-700" : "text-slate-500"}>
                  {requirement.current} / {requirement.needed}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Only orders the buyer confirmed count: they either leave a review or reply RECEIVED on WhatsApp after
            delivery. A single buyer counts for up to 3 orders.
          </p>
        </div>
      ) : null}

      {!hidden && progress.tier === "top_seller" ? (
        <p className="mt-3 text-sm text-slate-600">
          You&apos;re at the top tier. Keep your ratings high and your orders confirmed to keep it.
        </p>
      ) : null}
    </div>
  );
}
