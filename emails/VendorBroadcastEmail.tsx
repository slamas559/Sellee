import { Button, Column, Heading, Hr, Img, Row, Section, Text } from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface VendorBroadcastEmailProps {
  storeName: string;
  storeLink: string;
  storeLogoUrl?: string | null;
  subject: string;
  message: string;
  recipientName?: string | null;
}

export default function VendorBroadcastEmail({
  storeName,
  storeLink,
  storeLogoUrl,
  subject,
  message,
  recipientName,
}: VendorBroadcastEmailProps) {
  return (
    <EmailShell previewText={subject} width={480} radius={10}>
      <Section className="bg-white px-6 py-7">
        <Row>
          {storeLogoUrl ? (
            <Column width={40} style={{ verticalAlign: "middle" }}>
              <Img
                src={storeLogoUrl}
                alt={storeName}
                width={32}
                height={32}
                className="rounded-full"
                style={{ objectFit: "cover" }}
              />
            </Column>
          ) : null}
          <Column style={{ verticalAlign: "middle" }}>
            <Text className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#16a34a]">
              {storeName} · via Sellee
            </Text>
          </Column>
        </Row>

        <Heading className="mb-4 mt-3 text-[20px] font-black leading-[1.25] text-slate-900">{subject}</Heading>

        {recipientName ? (
          <Text className="mb-3 text-[13px] text-slate-700">Hi {recipientName},</Text>
        ) : null}

        {/* whiteSpace: pre-line preserves the vendor's own line breaks exactly
            as typed in the composer, rather than collapsing them into one
            run-on paragraph the way HTML normally treats plain text. */}
        <Text className="mb-5 text-[13px] leading-6 text-slate-700" style={{ whiteSpace: "pre-line" }}>
          {message}
        </Text>

        <Section className="text-center">
          <Button
            href={storeLink}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-[12px] font-bold text-white"
          >
            Visit {storeName}
          </Button>
        </Section>

        <Hr className="my-6 border-slate-200" />
        <Text className="m-0 text-[10px] leading-5 text-slate-500">
          You&apos;re receiving this because you follow {storeName} or have ordered from them on Sellee.
        </Text>
      </Section>
    </EmailShell>
  );
}