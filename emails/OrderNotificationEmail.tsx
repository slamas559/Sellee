import { EmailShell } from "./components/EmailShell";
import { DetailTable, P, PrimaryButton, SubTitle, TextLink, Title } from "./components/parts";
import { formatPrice } from "@/lib/currency";

export interface OrderNotificationEmailProps {
  storeName: string;
  orderRef: string;
  customerName: string;
  customerWhatsApp: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency?: string;
  dashboardUrl: string;
}

/** wa.me wants digits only (no +, spaces or dashes). */
function whatsappLink(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export default function OrderNotificationEmail({
  storeName,
  orderRef,
  customerName,
  customerWhatsApp,
  productName,
  quantity,
  unitPrice,
  totalAmount,
  currency = "NGN",
  dashboardUrl = "https://sellee.store/dashboard/orders",
}: OrderNotificationEmailProps) {
  const waLink = whatsappLink(customerWhatsApp);

  return (
    <EmailShell previewText={`${customerName} ordered ${productName} from ${storeName}.`} headerTag={`Order ${orderRef}`}>
      <Title>You have a new order</Title>
      <P>
        {customerName} just ordered from <strong style={{ color: "#0B1629" }}>{storeName}</strong>. Confirm it in your dashboard, then follow up with them on WhatsApp.
      </P>

      <DetailTable
        rows={[
          {
            label: productName,
            lead: true,
            value: formatPrice(unitPrice * quantity, currency),
            hint: `${quantity} × ${formatPrice(unitPrice, currency)}`,
          },
          { label: "Total", value: formatPrice(totalAmount, currency), strong: true },
        ]}
      />

      <SubTitle>Customer</SubTitle>
      <DetailTable
        rows={[
          { label: "Name", value: customerName },
          {
            label: "WhatsApp",
            value: waLink ? <TextLink href={waLink}>{customerWhatsApp}</TextLink> : customerWhatsApp,
          },
        ]}
      />

      <div style={{ height: 8 }} />
      <PrimaryButton href={dashboardUrl}>Review order</PrimaryButton>
    </EmailShell>
  );
}

OrderNotificationEmail.PreviewProps = { storeName: "Zuri Atelier", orderRef: "ORD-48213", customerName: "Ngozi Adeyemi", customerWhatsApp: "+234 801 234 5678", productName: "Ankara Midi Dress, size 12", quantity: 2, unitPrice: 22000, totalAmount: 44000, currency: "NGN", dashboardUrl: "https://sellee.store/dashboard/orders" } satisfies OrderNotificationEmailProps;
