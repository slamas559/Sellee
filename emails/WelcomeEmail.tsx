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

export interface WelcomeEmailProps {
  name?: string | null;
  marketplaceUrl?: string;
  role?: "vendor" | "customer";
}

export default function WelcomeEmail({
  name,
  marketplaceUrl = "https://sellee.store/marketplace",
  role = "customer",
}: WelcomeEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";
  const roleCopy =
    role === "vendor"
      ? "You can build your storefront, list products, and receive WhatsApp-powered orders from customers nearby."
      : "You can discover trusted local vendors, compare products, and track orders through WhatsApp-powered workflows.";

  return (
    <Html>
      <Head />
      <Preview>Welcome to Sellee, your local marketplace for WhatsApp commerce.</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 px-3 py-8 font-sans text-slate-700">
          <Container className="mx-auto w-full max-w-[600px] overflow-hidden rounded-[24px] bg-white shadow-sm">
            <Section className="bg-emerald-600 px-6 py-8 text-white">
              <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
                Welcome to Sellee
              </Text>
              <Heading className="mb-0 mt-3 text-[30px] font-black leading-[1.15] text-white">
                Hi {firstName}, local shopping just got easier.
              </Heading>
            </Section>

            <Section className="px-6 py-7">
              <Text className="m-0 text-[16px] leading-7 text-slate-700">
                Thanks for joining Sellee. We are building a modern local
                marketplace where customers can discover nearby products and
                vendors can sell with simple WhatsApp-integrated order tracking.
              </Text>
              <Text className="mb-0 mt-4 text-[16px] leading-7 text-slate-700">
                {roleCopy}
              </Text>

              <Section className="py-7 text-center">
                <Button
                  href={marketplaceUrl}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-[15px] font-bold text-white"
                >
                  Explore the Marketplace
                </Button>
              </Section>

              <Section className="rounded-[18px] bg-emerald-50 px-5 py-4">
                <Text className="m-0 text-[14px] font-bold text-emerald-800">
                  What you can do next
                </Text>
                <Text className="mb-0 mt-2 text-[14px] leading-6 text-emerald-900">
                  Browse products, save trusted stores, start orders through
                  WhatsApp, and keep your local commerce activity organized in
                  one place.
                </Text>
              </Section>

              <Hr className="my-6 border-slate-200" />
              <Text className="m-0 text-[12px] leading-5 text-slate-500">
                If you need help, reply to this email and our support team will
                receive your message.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}