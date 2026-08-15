import {
  Button,
  Heading,
  Hr,
  Img,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface EmailVerificationEmailProps {
  name?: string | null;
  verifyUrl: string;
}

export default function EmailVerificationEmail({ name, verifyUrl }: EmailVerificationEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";

  return (
    <EmailShell previewText="Verify your email for Sellee" width={600} radius={10}>
      <Section className="bg-emerald-600 px-6 py-8 text-white">
        <Img src="https://sellee.store/icon2.png" alt="Sellee" className="mb-4 h-8 w-auto" />
        <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
          Hi, {firstName}
        </Text>
        <Heading className="mb-0 mt-3 text-[25px] font-black leading-[1.15] text-white">
          Verify your email
        </Heading>
      </Section>

      <Section className="px-6 py-7">
        <Text className="m-0 text-[12px] leading-7 text-slate-700">
          Confirm this is your email address to finish verifying your Sellee vendor
          account. Verified vendors show a trust badge that shoppers can see on their
          storefront.
        </Text>

        <Section className="py-7 text-center">
          <Button href={verifyUrl} className="rounded-full bg-emerald-600 px-6 py-3 text-[12px] font-bold text-white">
            Verify Email
          </Button>
        </Section>

        <Section className="rounded-[14px] bg-amber-50 px-5 py-4">
          <Text className="m-0 text-[11px] font-bold text-amber-900">This link expires in 24 hours</Text>
          <Text className="mb-0 mt-2 text-[11px] leading-6 text-amber-900">
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Section>

        <Hr className="my-6 border-slate-200" />
        <Text className="m-0 text-[10px] leading-5 text-slate-500">
          If the button doesn&apos;t work, copy and paste this link into your browser:
          <br />
          {verifyUrl}
        </Text>
      </Section>
    </EmailShell>
  );
}