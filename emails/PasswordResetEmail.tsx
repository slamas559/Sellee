import { EmailShell } from "./components/EmailShell";
import { FallbackLink, Notice, P, PrimaryButton, Title } from "./components/parts";
import { firstNameOf } from "./components/tokens";

export interface PasswordResetEmailProps {
  name?: string | null;
  resetUrl: string;
}

export default function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  const firstName = firstNameOf(name);

  return (
    <EmailShell previewText="Use this link to choose a new Sellee password. It expires in 1 hour.">
      <Title>Reset your password</Title>
      <P>Hi {firstName}, we received a request to reset the password for your Sellee account. Choose a new one with the button below.</P>

      <PrimaryButton href={resetUrl}>Choose a new password</PrimaryButton>

      <Notice title="This link expires in 1 hour">
        If you didn&rsquo;t ask for this, ignore this email. Your password won&rsquo;t change unless you open the link and set a new one.
      </Notice>

      <FallbackLink href={resetUrl} />
    </EmailShell>
  );
}

PasswordResetEmail.PreviewProps = { name: "Amaka Obi", resetUrl: "https://sellee.store/reset-password?token=sample" } satisfies PasswordResetEmailProps;
