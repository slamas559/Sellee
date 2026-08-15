import {
  Button,
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface OrderNotificationEmailProps {
  storeName: string;
  orderRef: string;
  customerName: string;
  customerWhatsApp: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  dashboardUrl: string;
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  // Table-based row instead of `flex justify-between`: flexbox alignment
  // properties (justify-content especially) are stripped or ignored by a lot
  // of email clients, which is what was collapsing the label and value
  // together with no gap. A two-column table is universally supported.
  return (
    <Row>
      <Column align="left">
        <Text
          className={
            strong
              ? "m-0 text-[14px] font-semibold text-slate-900"
              : "m-0 text-[14px] text-slate-600"
          }
        >
          {label}
        </Text>
      </Column>
      <Column align="right">
        <Text
          className={
            strong
              ? "m-0 text-[16px] font-black text-emerald-600"
              : "m-0 text-[14px] font-semibold text-slate-900"
          }
        >
          {value}
        </Text>
      </Column>
    </Row>
  );
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
  dashboardUrl = "https://sellee.store/dashboard/orders",
}: OrderNotificationEmailProps) {
  const formattedTotal = totalAmount.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  return (
    <EmailShell previewText={`New order received at ${storeName}`} width={500} radius={10}>
      <Section className="bg-emerald-600 px-6 py-8 text-white">
        <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
          New Order Alert
        </Text>
        <Heading className="mb-0 mt-3 text-[30px] font-black leading-[1.15] text-white">
          Order #{orderRef}
        </Heading>
      </Section>

      <Section className="px-6 py-7">
        <Text className="m-0 text-[16px] font-semibold text-slate-900">
          Hi {storeName},
        </Text>

        <Text className="mt-4 text-[15px] leading-7 text-slate-700">
          You received a new order! Here are the details:
        </Text>

        <Hr className="my-5 border-slate-200" />

        <Section className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-4">
          <Text className="m-0 text-[13px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            Order Details
          </Text>

          <Section className="mt-4">
            <DetailRow label="Customer" value={customerName} />
            <Row>
              <Column style={{ height: 10 }} />
            </Row>
            <DetailRow label="WhatsApp" value={customerWhatsApp} />

            <Hr className="my-3 border-emerald-200" />

            <DetailRow label="Product" value={productName} />
            <Row>
              <Column style={{ height: 10 }} />
            </Row>
            <DetailRow label="Quantity" value={`${quantity}x`} />
            <Row>
              <Column style={{ height: 10 }} />
            </Row>
            <DetailRow label="Unit Price" value={`₦${unitPrice.toLocaleString("en-NG")}`} />

            <Hr className="my-3 border-emerald-200" />

            <DetailRow label="Total" value={formattedTotal} strong />
          </Section>
        </Section>

        <Text className="mt-6 text-[14px] leading-6 text-slate-700">
          Log in to your dashboard to confirm or reject the order, and manage all your orders in one place.
        </Text>
      </Section>

      <Section className="px-6 py-6">
        <Button
          className="inline-block rounded-lg bg-emerald-600 px-6 py-3 text-center font-semibold text-white"
          href={dashboardUrl}
        >
          View in Dashboard
        </Button>
      </Section>

      <Hr className="border-slate-200" />

      <Section className="px-6 py-6 text-center">
        <Text className="m-0 text-xs text-slate-500">
          © 2026 Sellee. All rights reserved.
        </Text>
        <Text className="mt-2 text-xs text-slate-500">
          This is an automated notification. Please do not reply to this email.
        </Text>
      </Section>
    </EmailShell>
  );
}