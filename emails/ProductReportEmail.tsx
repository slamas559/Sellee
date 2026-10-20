import { EmailShell } from "./components/EmailShell";
import { DetailTable, P, PrimaryButton, SubTitle, TextLink, Title } from "./components/parts";
import { color, font } from "./components/tokens";

export interface ProductReportEmailProps {
  productId: string;
  productName: string;
  productUrl: string;
  storeName: string;
  reason: string;
  details?: string | null;
  reporterEmail?: string | null;
  /** Link to the reports queue in the admin console. */
  adminUrl: string;
}

/** Internal: goes to the support inbox when a customer reports a product. */
export default function ProductReportEmail({
  productId,
  productName,
  productUrl,
  storeName,
  reason,
  details,
  reporterEmail,
  adminUrl,
}: ProductReportEmailProps) {
  return (
    <EmailShell help={null} previewText={`${productName} was reported: ${reason}`} headerTag="Trust & safety · Internal">
      <Title>A product was reported</Title>
      <P>
        A customer reported <strong style={{ color: color.ink }}>{productName}</strong> from {storeName}.
      </P>

      <DetailTable
        rows={[
          { label: "Product", value: <TextLink href={productUrl}>{productName}</TextLink> },
          { label: "Store", value: storeName },
          { label: "Reason", value: reason },
          { label: "Reporter", value: reporterEmail || "Anonymous" },
          { label: "Product ID", value: productId, mono: true },
        ]}
      />

      {details ? (
        <>
          <SubTitle>Details from the reporter</SubTitle>
          <P style={{ whiteSpace: "pre-wrap" }}>{details}</P>
        </>
      ) : null}

      <div style={{ height: 8 }} />
      <PrimaryButton href={adminUrl}>Open in Atlas</PrimaryButton>
      <p style={{ margin: "14px 0 0", fontFamily: font.sans, fontSize: 13, lineHeight: "20px", color: color.muted }}>
        Or <TextLink href={productUrl}>view the product page</TextLink>.
      </p>
    </EmailShell>
  );
}

ProductReportEmail.PreviewProps = { productId: "b3f1c2d4-8a91-4b6e-9d1f-0a2b3c4d5e6f", productName: "iPhone 15 Pro (unlocked)", productUrl: "https://sellee.store/v/techhub/iphone-15", storeName: "TechHub NG", reason: "Counterfeit or fake", details: "The photos are stolen from another site.", reporterEmail: "amaka@example.com", adminUrl: "https://atlas.sellee.store/admin-console/support" } satisfies ProductReportEmailProps;
