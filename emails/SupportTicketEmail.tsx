import { EmailShell } from "./components/EmailShell";
import { DetailTable, P, Title } from "./components/parts";
import { firstNameOf } from "./components/tokens";

export interface SupportTicketEmailProps {
  ticketId: string;
  name?: string | null;
  subject?: string | null;
}

export default function SupportTicketEmail({ ticketId, name, subject }: SupportTicketEmailProps) {
  const firstName = firstNameOf(name);

  return (
    <EmailShell previewText={`We received your request (${ticketId}). A person will reply within 24 hours.`}>
      <Title>We&rsquo;ve got your request</Title>
      <P>
        Hi {firstName}, thanks for contacting Sellee Support. A member of our team will reply within 24 hours. If you have more to add, just reply to this
        email.
      </P>

      <DetailTable
        rows={[
          { label: "Ticket", value: ticketId, mono: true },
          ...(subject ? [{ label: "Topic", value: subject }] : []),
          { label: "Expected reply", value: "Within 24 hours" },
        ]}
      />

      <P small muted style={{ margin: "16px 0 0" }}>
        Keep this reference handy if you need to follow up.
      </P>
    </EmailShell>
  );
}

SupportTicketEmail.PreviewProps = { ticketId: "SEL-20261020-K4P9QZ", name: "Amaka Obi", subject: "Payment issue" } satisfies SupportTicketEmailProps;
