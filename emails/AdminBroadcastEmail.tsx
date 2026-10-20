import { EmailShell } from "./components/EmailShell";
import { P, Title } from "./components/parts";
import { firstNameOf } from "./components/tokens";

export interface AdminBroadcastEmailProps {
  subject: string;
  paragraphs: string[];
  recipientName?: string | null;
}

export default function AdminBroadcastEmail({ subject, paragraphs, recipientName }: AdminBroadcastEmailProps) {
  return (
    <EmailShell previewText={subject} reason="You are receiving this because you have an account on Sellee.">
      <Title>{subject}</Title>

      {recipientName ? <P>Hi {firstNameOf(recipientName)},</P> : null}

      {paragraphs.map((paragraph, index) => (
        <P key={index} style={{ whiteSpace: "pre-line" }}>
          {paragraph}
        </P>
      ))}
    </EmailShell>
  );
}

AdminBroadcastEmail.PreviewProps = { subject: "A change to how verification badges work", recipientName: "Tunde Bello", paragraphs: ["From next week, the Verified badge needs a confirmed email and an approved ID.", "Existing badges stay until your next review. You do not need to do anything now."] } satisfies AdminBroadcastEmailProps;
