import { Button, Heading, Img, Section, Text } from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface VerificationDecisionEmailProps {
  name?: string | null;
  storeName: string;
  decision: "approved" | "rejected" | "suspended";
  /** Shown to the vendor when the decision is "rejected" or "suspended". */
  reason?: string | null;
  /** True when the store now has a badge, i.e. every check has passed. */
  badgeLive?: boolean;
  verificationUrl: string;
}

export default function VerificationDecisionEmail({
  name,
  storeName,
  decision,
  reason,
  badgeLive = false,
  verificationUrl,
}: VerificationDecisionEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";
  const approved = decision === "approved";
  const suspended = decision === "suspended";

  const heading = approved
    ? "Your ID was approved"
    : suspended
      ? "Your verification badge was suspended"
      : "We couldn't approve your ID";
  const accent = approved ? "bg-emerald-600" : suspended ? "bg-rose-700" : "bg-slate-800";

  return (
    <EmailShell
      previewText={
        approved
          ? `Your ID for ${storeName} was approved`
          : suspended
            ? `The verification badge for ${storeName} was suspended`
            : `Your ID for ${storeName} needs another look`
      }
      width={600}
      radius={10}
    >
      <Section className={`${accent} px-6 py-8 text-white`}>
        <Img src="https://sellee.store/icon2.png" alt="Sellee" className="mb-4 h-8 w-auto" />
        <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">Hi, {firstName}</Text>
        <Heading className="mb-0 mt-3 text-[25px] font-black leading-[1.15] text-white">{heading}</Heading>
      </Section>

      <Section className="px-6 py-7">
        {suspended ? (
          <>
            <Text className="m-0 text-[13px] leading-7 text-slate-700">
              The verification badge on <strong>{storeName}</strong> has been suspended, so it no longer shows on your
              storefront or in the marketplace.
            </Text>
            <Section className="mt-4 rounded-[14px] bg-amber-50 px-5 py-4">
              <Text className="m-0 text-[11px] font-bold text-amber-900">Reason</Text>
              <Text className="mb-0 mt-2 text-[12px] leading-6 text-amber-900">
                {reason?.trim() || "The badge was suspended after a review by our team."}
              </Text>
            </Section>
            <Text className="mb-0 mt-4 text-[13px] leading-7 text-slate-600">
              Your store keeps working normally and you can keep taking orders. If you think this is a mistake, reply
              to this email and our team will look at it.
            </Text>
          </>
        ) : approved ? (
          <>
            <Text className="m-0 text-[13px] leading-7 text-slate-700">
              Good news: the ID you submitted for <strong>{storeName}</strong> has been reviewed and approved.
            </Text>
            <Text className="mb-0 mt-3 text-[13px] leading-7 text-slate-600">
              {badgeLive
                ? "All your checks are complete, so the Verified badge is now live on your storefront."
                : "Your Verified badge goes live once every step on your checklist is complete. Open your verification page to see what's left."}
            </Text>
          </>
        ) : (
          <>
            <Text className="m-0 text-[13px] leading-7 text-slate-700">
              We reviewed the ID you submitted for <strong>{storeName}</strong> but couldn&apos;t approve it this time.
            </Text>
            <Section className="mt-4 rounded-[14px] bg-amber-50 px-5 py-4">
              <Text className="m-0 text-[11px] font-bold text-amber-900">Reason</Text>
              <Text className="mb-0 mt-2 text-[12px] leading-6 text-amber-900">
                {reason?.trim() || "The photos didn't meet our requirements."}
              </Text>
            </Section>
            <Text className="mb-0 mt-4 text-[13px] leading-7 text-slate-600">
              You can fix this and submit again from your verification page. Your store keeps working normally in the
              meantime.
            </Text>
          </>
        )}

        <Section className="py-7 text-center">
          <Button href={verificationUrl} className="rounded-full bg-emerald-600 px-6 py-3 text-[12px] font-bold text-white">
            {approved ? "View verification status" : suspended ? "View your badge" : "Resubmit your ID"}
          </Button>
        </Section>
      </Section>
    </EmailShell>
  );
}
