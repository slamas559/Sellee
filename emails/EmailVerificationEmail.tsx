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
  role?: "vendor" | "customer" | "admin" | null;
}

export default function EmailVerificationEmail({ name, verifyUrl, role }: EmailVerificationEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";
  const benefitCopy =
    role === "vendor"
      ? "Once verified, your store gets a trust badge shoppers can see on your storefront."
      : "Once verified, we'll be able to send you order updates and anything else you need to know.";

  return (
    <EmailShell previewText="Confirm your email for Sellee" width={600} radius={10}>
      <Section className="bg-emerald-600 px-6 py-8 text-white">
        <Img src="https://sellee.store/icon2.png" alt="Sellee" className="mb-4 h-8 w-auto" />
        <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
          Hi, {firstName}
        </Text>
        <Heading className="mb-0 mt-3 text-[25px] font-black leading-[1.15] text-white">
          Confirm your email
        </Heading>
      </Section>

      <Section className="px-6 py-7">
        <Text className="m-0 text-[13px] leading-7 text-slate-700">
          One quick step to finish setting up your Sellee account — confirm this is your
          email address by clicking the button below.
        </Text>
        <Text className="mb-0 mt-3 text-[13px] leading-7 text-slate-600">
          {benefitCopy}
        </Text>

        <Section className="py-7 text-center">
          <Button href={verifyUrl} className="rounded-full bg-emerald-600 px-6 py-3 text-[12px] font-bold text-white">
            Confirm email address
          </Button>
        </Section>

        <Section className="rounded-[14px] bg-amber-50 px-5 py-4">
          <Text className="m-0 text-[11px] font-bold text-amber-900">This link expires in 24 hours</Text>
          <Text className="mb-0 mt-2 text-[11px] leading-6 text-amber-900">
            Didn&apos;t create a Sellee account? You can safely ignore this email.
          </Text>
        </Section>

        <Hr className="my-6 border-slate-200" />
        <Text className="m-0 text-[10px] leading-5 text-slate-500">
          If the button above doesn&apos;t work, copy and paste this link into your browser:
          <br />
          {verifyUrl}
        </Text>
      </Section>
    </EmailShell>
  );
}