import {
  Body,
  Button,
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
    <Html>
      <Head />
      <Preview>New order received at {storeName}</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 px-3 py-8 font-sans text-slate-700">
          <Container className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[24px] bg-white shadow-sm">
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

              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <Text className="m-0 text-[13px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  Order Details
                </Text>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <Text className="m-0 text-[14px] text-slate-600">Customer: </Text>
                    <Text className="m-0 text-[14px] font-semibold text-slate-900">
                      {customerName}
                    </Text>
                  </div>

                  <div className="flex justify-between">
                    <Text className="m-0 text-[14px] text-slate-600">WhatsApp: </Text>
                    <Text className="m-0 text-[14px] font-semibold text-slate-900">
                      {customerWhatsApp}
                    </Text>
                  </div>

                  <Hr className="my-2 border-emerald-200" />

                  <div className="flex justify-between">
                    <Text className="m-0 text-[14px] text-slate-600">Product: </Text>
                    <Text className="m-0 text-[14px] font-semibold text-slate-900">
                      {productName}
                    </Text>
                  </div>

                  <div className="flex justify-between">
                    <Text className="m-0 text-[14px] text-slate-600">Quantity: </Text>
                    <Text className="m-0 text-[14px] font-semibold text-slate-900">
                      {quantity}x
                    </Text>
                  </div>

                  <div className="flex justify-between">
                    <Text className="m-0 text-[14px] text-slate-600">Unit Price: </Text>
                    <Text className="m-0 text-[14px] font-semibold text-slate-900">
                      ₦{unitPrice.toLocaleString("en-NG")}
                    </Text>
                  </div>

                  <Hr className="my-2 border-emerald-200" />

                  <div className="flex justify-between">
                    <Text className="m-0 text-[14px] font-semibold text-slate-900">
                      Total:
                    </Text>
                    <Text className="m-0 text-[16px] font-black text-emerald-600">
                      {formattedTotal}
                    </Text>
                  </div>
                </div>
              </div>

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
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
