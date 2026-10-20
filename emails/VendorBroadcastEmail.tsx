import { Column, Row, Text } from "@react-email/components";
import { EmailShell } from "./components/EmailShell";
import { Avatar, P, PrimaryButton, Title } from "./components/parts";
import { color, firstNameOf, font } from "./components/tokens";

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
  // This message is from the vendor, so the vendor's identity leads and Sellee
  // steps back to "via Sellee" in the header and the footer.
  const header = (
    <Row>
      <Column width={52} valign="middle">
        <Avatar src={storeLogoUrl} alt={storeName} size={40} />
      </Column>
      <Column valign="middle">
        <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 15, lineHeight: "20px", fontWeight: 700, color: color.ink }}>{storeName}</Text>
        <Text style={{ margin: 0, fontFamily: font.sans, fontSize: 12, lineHeight: "18px", color: color.muted }}>via Sellee</Text>
      </Column>
    </Row>
  );

  return (
    <EmailShell
      previewText={subject}
      header={header}
      reason={`You are receiving this because you follow ${storeName} or have ordered from them on Sellee.`}
      help={
        <>
          To reach {storeName}, message them on WhatsApp from their store page. For help with Sellee itself, write to{" "}
          <a href="mailto:support@sellee.store" style={{ color: color.muted, textDecoration: "underline" }}>
            support@sellee.store
          </a>
          .
        </>
      }
    >
      <Title>{subject}</Title>

      {recipientName ? <P>Hi {firstNameOf(recipientName)},</P> : null}

      {/* pre-line keeps the vendor's own line breaks exactly as typed. */}
      <P style={{ whiteSpace: "pre-line" }}>{message}</P>

      <PrimaryButton href={storeLink}>Visit {storeName}</PrimaryButton>
    </EmailShell>
  );
}

VendorBroadcastEmail.PreviewProps = { storeName: "Zuri Atelier", storeLink: "https://sellee.store/v/zuri", subject: "New Ankara pieces just landed", recipientName: "Amaka Obi", message: "Our new Ankara collection is in.\n\nFree delivery within Lagos this week. Message us on WhatsApp to reserve your size." } satisfies VendorBroadcastEmailProps;
