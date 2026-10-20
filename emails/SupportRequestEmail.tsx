import { EmailShell } from "./components/EmailShell";
import { DetailTable, P, SubTitle, Title } from "./components/parts";
import { color, font } from "./components/tokens";

export interface SupportRequestEmailProps {
  ticketId: string;
  issueType: string;
  requesterName: string;
  requesterEmail: string;
  details: string;
}

/** Internal: goes to the support inbox when someone submits the Help Center form. */
export default function SupportRequestEmail({ ticketId, issueType, requesterName, requesterEmail, details }: SupportRequestEmailProps) {
  return (
    <EmailShell help={null} previewText={`${issueType} from ${requesterName}`} headerTag="Support · Internal">
      <Title>New support request</Title>
      <P>Submitted through the Help Center. Reply to this email to answer {requesterName} directly.</P>

      <DetailTable
        rows={[
          { label: "Ticket", value: ticketId, mono: true },
          { label: "Issue type", value: issueType },
          { label: "Name", value: requesterName },
          { label: "Email", value: requesterEmail },
        ]}
      />

      <SubTitle>Details</SubTitle>
      <div
        style={{
          margin: 0,
          padding: "14px 16px",
          backgroundColor: "#F8F9FB",
          border: `1px solid ${color.line}`,
          borderRadius: 8,
          fontFamily: font.sans,
          fontSize: 15,
          lineHeight: "24px",
          color: color.body,
          whiteSpace: "pre-wrap",
        }}
      >
        {details}
      </div>
    </EmailShell>
  );
}

SupportRequestEmail.PreviewProps = { ticketId: "SEL-20261020-K4P9QZ", issueType: "Payment issue", requesterName: "Amaka Obi", requesterEmail: "amaka@example.com", details: "I paid for an order twice by mistake.\nOrder ref ORD-48213." } satisfies SupportRequestEmailProps;
