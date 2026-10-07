import Link from "next/link";
import { BadgeCheck, CircleAlert, CircleDashed, Clock3 } from "lucide-react";
import type { PublicPayoutAccount } from "@/lib/payout-accounts";
import type { IdSubmissionPublic } from "@/lib/verification-constants";

type StepState = "done" | "review" | "todo" | "attention";

type Step = {
  key: string;
  title: string;
  detail: string;
  state: StepState;
  href?: string;
  actionLabel?: string;
};

type VerificationChecklistProps = {
  whatsappVerified: boolean;
  payoutAccount: PublicPayoutAccount | null;
  idSubmission: IdSubmissionPublic | null;
};

function buildSteps({ whatsappVerified, payoutAccount, idSubmission }: VerificationChecklistProps): Step[] {
  const whatsapp: Step = whatsappVerified
    ? { key: "whatsapp", title: "WhatsApp number confirmed", detail: "Your store's WhatsApp number is verified.", state: "done" }
    : {
        key: "whatsapp",
        title: "Confirm your store's WhatsApp number",
        detail: "Buyers reach you on this number, so we need to know it's really yours.",
        state: "todo",
        href: "/dashboard/store",
        actionLabel: "Verify number",
      };

  let payout: Step;
  if (!payoutAccount) {
    payout = {
      key: "payout",
      title: "Add your payout account",
      detail: "The bank account you receive payments into.",
      state: "todo",
      href: "#payout-account",
      actionLabel: "Add account",
    };
  } else if (payoutAccount.name_match_status === "matched") {
    payout = { key: "payout", title: "Payout account verified", detail: `${payoutAccount.bank_name} · name matches your ID.`, state: "done" };
  } else if (payoutAccount.name_match_status === "mismatch") {
    payout = {
      key: "payout",
      title: "Payout account name doesn't match",
      detail: "The account name didn't match your ID. Use an account in your own name, or resubmit your ID.",
      state: "attention",
      href: "#payout-account",
      actionLabel: "Change account",
    };
  } else {
    payout = {
      key: "payout",
      title: "Payout account added",
      detail: `${payoutAccount.bank_name} · the name will be checked against your ID.`,
      state: "review",
    };
  }

  let id: Step;
  if (!idSubmission) {
    id = {
      key: "id",
      title: "Submit your ID",
      detail: "A photo of a government ID and a selfie, reviewed by our team.",
      state: "todo",
      href: "#id-verification",
      actionLabel: "Submit ID",
    };
  } else if (idSubmission.status === "approved") {
    id = { key: "id", title: "ID approved", detail: "Your identity has been confirmed.", state: "done" };
  } else if (idSubmission.status === "rejected") {
    id = {
      key: "id",
      title: "ID needs to be resubmitted",
      detail: idSubmission.rejection_reason ?? "Your last submission couldn't be approved.",
      state: "attention",
      href: "#id-verification",
      actionLabel: "Resubmit",
    };
  } else {
    id = { key: "id", title: "ID under review", detail: "We'll review your submission and update this page.", state: "review" };
  }

  return [whatsapp, payout, id];
}

const STATE_STYLE: Record<StepState, { icon: typeof BadgeCheck; ring: string; iconColor: string }> = {
  done: { icon: BadgeCheck, ring: "border-emerald-200 bg-emerald-50/60", iconColor: "text-emerald-600" },
  review: { icon: Clock3, ring: "border-amber-200 bg-amber-50/60", iconColor: "text-amber-600" },
  todo: { icon: CircleDashed, ring: "border-slate-200 bg-white", iconColor: "text-slate-400" },
  attention: { icon: CircleAlert, ring: "border-rose-200 bg-rose-50/60", iconColor: "text-rose-600" },
};

export function VerificationChecklist(props: VerificationChecklistProps) {
  const steps = buildSteps(props);
  const doneCount = steps.filter((step) => step.state === "done").length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black tracking-tight text-slate-900">Your checklist</h2>
        <p className="text-sm font-semibold text-slate-600">
          {doneCount} of {steps.length} complete
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }}
        />
      </div>

      <ol className="mt-4 space-y-3">
        {steps.map((step) => {
          const style = STATE_STYLE[step.state];
          const Icon = style.icon;
          return (
            <li key={step.key} className={`flex items-start gap-3 rounded-md border p-3 ${style.ring}`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-0.5 break-words text-sm text-slate-600">{step.detail}</p>
              </div>
              {step.href && step.actionLabel ? (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {step.actionLabel}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
