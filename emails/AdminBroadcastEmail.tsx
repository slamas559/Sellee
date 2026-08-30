import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface AdminBroadcastEmailProps {
  subject: string;
  paragraphs: string[];
  recipientName?: string | null;
}

export default function AdminBroadcastEmail({ subject, paragraphs, recipientName }: AdminBroadcastEmailProps) {
  return (
    <EmailShell previewText={subject} width={480} radius={10}>
      <Section className="bg-white px-6 py-7">
        <Text className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#16a34a]">
          Sellee
        </Text>
        <Heading className="mb-4 mt-2 text-[20px] font-black leading-[1.25] text-slate-900">
          {subject}
        </Heading>

        {recipientName ? (
          <Text className="mb-3 text-[13px] text-slate-700">Hi {recipientName},</Text>
        ) : null}

        {paragraphs.map((paragraph, index) => (
          <Text key={index} className="mb-3 text-[13px] leading-6 text-slate-700">
            {paragraph}
          </Text>
        ))}

        <Hr className="my-6 border-slate-200" />
        <Text className="m-0 text-[10px] leading-5 text-slate-500">
          You&apos;re receiving this because you have an account on Sellee.
        </Text>
      </Section>
    </EmailShell>
  );
}