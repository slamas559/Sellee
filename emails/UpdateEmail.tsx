import { Img } from "@react-email/components";
import { EmailShell } from "./components/EmailShell";
import { P, PrimaryButton, SubTitle, Title } from "./components/parts";
import { color } from "./components/tokens";

export interface UpdateEmailBlock {
  heading?: string;
  body: string;
}

export interface UpdateEmailProps {
  headline: string;
  previewText?: string;
  intro?: string;
  heroImageUrl?: string;
  heroAlt?: string;
  blocks?: UpdateEmailBlock[];
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}

export default function UpdateEmail({
  headline,
  previewText = "A new update from Sellee.",
  intro,
  heroImageUrl,
  heroAlt = "",
  blocks = [],
  actionLabel = "Learn more",
  actionUrl = "https://sellee.store",
  footerNote = "You are receiving this because you have a Sellee account.",
}: UpdateEmailProps) {
  return (
    <EmailShell previewText={previewText} reason={footerNote}>
      <Title size={28}>{headline}</Title>
      {intro ? <P>{intro}</P> : null}

      {heroImageUrl ? (
        <Img
          src={heroImageUrl}
          alt={heroAlt}
          width={480}
          style={{ display: "block", width: "100%", height: "auto", borderRadius: 8, border: `1px solid ${color.line}`, margin: "8px 0 8px" }}
        />
      ) : null}

      {blocks.map((block, index) => (
        <div key={`${block.heading ?? "update"}-${index}`}>
          {block.heading ? <SubTitle>{block.heading}</SubTitle> : null}
          <P style={block.heading ? undefined : { marginTop: 8 }}>{block.body}</P>
        </div>
      ))}

      <PrimaryButton href={actionUrl}>{actionLabel}</PrimaryButton>
    </EmailShell>
  );
}

UpdateEmail.PreviewProps = { headline: "Your storefront, redesigned", intro: "Nine new storefront templates are live, with a full-size preview so you can see your store before you switch.", blocks: [{ heading: "Preview before you choose", body: "Open any template from your dashboard and see it with your own logo, colours and products." }, { heading: "Powered by your plan", body: "Free stores keep the Market template. Pro and Business unlock every layout." }], actionLabel: "Explore templates", actionUrl: "https://sellee.store/dashboard/store" } satisfies UpdateEmailProps;
