import { EmailShell } from "./components/EmailShell";
import { FallbackLink, Notice, P, PrimaryButton, Title } from "./components/parts";
import { firstNameOf } from "./components/tokens";

export interface EmailVerificationEmailProps {
  name?: string | null;
  verifyUrl: string;
  role?: "vendor" | "customer" | "admin" | null;
}

export default function EmailVerificationEmail({ name, verifyUrl, role }: EmailVerificationEmailProps) {
  const firstName = firstNameOf(name);
  const benefit =
    role === "vendor"
      ? "Once confirmed, your store can earn a trust badge that shoppers see on your storefront."
      : "Once confirmed, we can send you order updates and anything else you need to know.";

  return (
    <EmailShell previewText="Confirm your email to finish setting up your Sellee account.">
      <Title>Confirm your email address</Title>
      <P>Hi {firstName}, you are one step away from finishing your Sellee account. Confirm that this is your email address to continue.</P>
      <P>{benefit}</P>

      <PrimaryButton href={verifyUrl}>Confirm email address</PrimaryButton>

      <Notice title="This link expires in 24 hours">If you didn&rsquo;t create a Sellee account, you can ignore this email and nothing will happen.</Notice>

      <FallbackLink href={verifyUrl} />
    </EmailShell>
  );
}

EmailVerificationEmail.PreviewProps = { name: "Amaka Obi", role: "customer", verifyUrl: "https://sellee.store/verify-email?token=sample" } satisfies EmailVerificationEmailProps;
