import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export interface SupportTicketEmailProps {
  ticketId: string;
  name?: string | null;
  subject?: string | null;
}

export default function SupportTicketEmail({
  ticketId,
  name,
  subject,
}: SupportTicketEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";

  return (
    <Html>
      <Head />
      <Preview>We received your Sellee support request.</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 px-3 py-8 font-sans text-slate-700">
          <Container className="mx-auto w-full max-w-[600px] overflow-hidden rounded-[24px] bg-white shadow-sm">
            <Section className="bg-sky-600 px-6 py-8 text-white">
              <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-sky-50">
                Support ticket received
              </Text>
              <Heading className="mb-0 mt-3 text-[30px] font-black leading-[1.15] text-white">
                Hi {firstName}, we are on it.
              </Heading>
            </Section>

            <Section className="px-6 py-7">
              <Text className="m-0 text-[16px] leading-7 text-slate-700">
                Thanks for reaching out to Sellee Support. We have received
                your message and a support agent will reach out within 24 hours.
              </Text>
              <Text className="mb-0 mt-4 text-[16px] leading-7 text-slate-700">
                We appreciate your patience while we review the details and
                route your request to the right person.
              </Text>

              <Section className="my-6 rounded-[18px] border border-sky-100 bg-sky-50 px-5 py-4">
                <Text className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-sky-700">
                  Ticket ID
                </Text>
                <Text className="mb-0 mt-2 text-[24px] font-black tracking-[0.04em] text-slate-950">
                  {ticketId}
                </Text>
                {subject ? (
                  <Text className="mb-0 mt-3 text-[14px] leading-6 text-slate-600">
                    Subject: {subject}
                  </Text>
                ) : null}
              </Section>

              <Text className="m-0 text-[14px] leading-6 text-slate-600">
                You can reply directly to this email if you need to add more
                information to your complaint or support request.
              </Text>

              <Hr className="my-6 border-slate-200" />
              <Text className="m-0 text-[12px] leading-5 text-slate-500">
                Sellee Support receives replies at support@sellee.store.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

