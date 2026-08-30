import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface AdminInviteEmailProps {
  inviterName?: string | null;
  acceptUrl: string;
}

export default function AdminInviteEmail({ inviterName, acceptUrl }: AdminInviteEmailProps) {
  const inviter = inviterName?.trim() || "A Sellee admin";

  return (
    <EmailShell previewText="You've been invited to Sellee's admin console" width={500} radius={10}>
      <Section className="bg-[#14171C] px-6 py-8 text-white">
        <Text className="m-0 text-[10px] font-bold uppercase tracking-[0.24em] text-[#B98A3E]">
          Atlas · Admin access
        </Text>
        <Heading className="mb-0 mt-3 text-[24px] font-black leading-[1.15] text-white">
          You&apos;ve been invited as an admin
        </Heading>
      </Section>

      <Section className="px-6 py-7">
        <Text className="m-0 text-[12px] leading-7 text-slate-700">
          {inviter} has invited you to join the Sellee admin console. This gives you access to
          manage vendors, customers, orders, and platform-wide settings.
        </Text>

        <Section className="py-7 text-center">
          <Button href={acceptUrl} className="rounded-md bg-[#14171C] px-6 py-3 text-[12px] font-bold text-white">
            Accept invite
          </Button>
        </Section>

        <Section className="rounded-[10px] bg-[#F0EFE9] px-5 py-4">
          <Text className="m-0 text-[11px] font-bold text-[#14171C]">This link expires in 72 hours</Text>
          <Text className="mb-0 mt-2 text-[11px] leading-6 text-slate-600">
            If you weren&apos;t expecting this, you can ignore this email - no account will be
            created.
          </Text>
        </Section>

        <Hr className="my-6 border-slate-200" />
        <Text className="m-0 text-[10px] leading-5 text-slate-500">
          If the button doesn&apos;t work, copy and paste this link into your browser:
          <br />
          {acceptUrl}
        </Text>
      </Section>
    </EmailShell>
  );
}
