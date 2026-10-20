import { EmailShell } from "./components/EmailShell";
import { FallbackLink, Notice, P, PrimaryButton, Title } from "./components/parts";

export interface AdminInviteEmailProps {
  inviterName?: string | null;
  acceptUrl: string;
}

export default function AdminInviteEmail({ inviterName, acceptUrl }: AdminInviteEmailProps) {
  const inviter = inviterName?.trim() || "A Sellee admin";

  return (
    <EmailShell previewText="You have been invited to join the Sellee admin console." headerTag="Atlas · Admin console">
      <Title>You&rsquo;ve been invited to Atlas</Title>
      <P>
        {inviter} invited you to join the Sellee admin console. You&rsquo;ll be able to manage vendors, customers, orders and platform settings.
      </P>

      <PrimaryButton href={acceptUrl}>Accept invitation</PrimaryButton>

      <Notice title="This invitation expires in 72 hours">If you weren&rsquo;t expecting it, ignore this email. No account is created until you accept.</Notice>

      <FallbackLink href={acceptUrl} />
    </EmailShell>
  );
}

AdminInviteEmail.PreviewProps = { inviterName: "Chioma Eze", acceptUrl: "https://atlas.sellee.store/accept?token=sample" } satisfies AdminInviteEmailProps;
