import { EmailShell } from "./components/EmailShell";
import { Notice, P, PrimaryButton, Title } from "./components/parts";
import { firstNameOf } from "./components/tokens";

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
  const firstName = firstNameOf(name);
  const approved = decision === "approved";
  const suspended = decision === "suspended";

  const title = approved ? "Your ID was approved" : suspended ? "Your verification badge was suspended" : "We couldn\u2019t approve your ID";
  const preview = approved
    ? `The ID you submitted for ${storeName} was approved.`
    : suspended
      ? `The verification badge for ${storeName} was suspended.`
      : `The ID you submitted for ${storeName} needs another look.`;
  const cta = approved ? "View verification status" : suspended ? "View your badge" : "Resubmit your ID";

  return (
    <EmailShell previewText={preview}>
      <Title>{title}</Title>

      {approved ? (
        <>
          <P>
            Hi {firstName}, the ID you submitted for <strong style={{ color: "#0B1629" }}>{storeName}</strong> has been reviewed and approved.
          </P>
          <P>
            {badgeLive
              ? "All your checks are complete, so the Verified badge is now live on your storefront."
              : "Your Verified badge goes live once every step on your checklist is complete. Your verification page shows what is left."}
          </P>
        </>
      ) : suspended ? (
        <>
          <P>
            Hi {firstName}, the verification badge on <strong style={{ color: "#0B1629" }}>{storeName}</strong> has been suspended, so it no longer shows on your
            storefront or in the marketplace.
          </P>
          <Notice tone="danger" title="Reason">
            {reason?.trim() || "The badge was suspended after a review by our team."}
          </Notice>
          <P style={{ margin: "20px 0 8px" }}>
            Your store keeps working normally and you can keep taking orders. If you think this is a mistake, reply to this email and we will take another look.
          </P>
        </>
      ) : (
        <>
          <P>
            Hi {firstName}, we reviewed the ID you submitted for <strong style={{ color: "#0B1629" }}>{storeName}</strong> but couldn&rsquo;t approve it this time.
          </P>
          <Notice tone="warn" title="Reason">
            {reason?.trim() || "The photos didn\u2019t meet our requirements."}
          </Notice>
          <P style={{ margin: "20px 0 8px" }}>You can fix this and submit again from your verification page. Your store keeps working normally in the meantime.</P>
        </>
      )}

      <PrimaryButton href={verificationUrl}>{cta}</PrimaryButton>
    </EmailShell>
  );
}

VerificationDecisionEmail.PreviewProps = { name: "Tunde Bello", storeName: "Zuri Atelier", decision: "rejected", reason: "The photo of the ID was blurry and the name could not be read.", verificationUrl: "https://sellee.store/dashboard/verification" } satisfies VerificationDecisionEmailProps;
