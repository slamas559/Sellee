import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Row,
  Column,
  Link,
  Img,
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
      ? "You can build your storefront, list products, and receive WhatsApp-powered orders from customers nearby and faraway."
      : "You can discover trusted vendors, compare products, and track orders through WhatsApp-powered workflows.";

  return (
    <Html>
      <Head />
      <Preview>Welcome to Sellee, your local marketplace for WhatsApp commerce.</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 px-3 py-8 font-sans text-slate-700">
          <Container className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[20px] bg-white shadow-sm">
            <Section className="bg-emerald-600 px-6 py-8 text-white">
              <Img
                src="https://sellee.store/icon2.png"
                alt="Sellee"
                width={36}
                height={36}
                className="mb-4"
              />
              <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
                Hi, {firstName}
              </Text>
              <Heading className="mb-0 mt-3 text-[25px] font-black leading-[1.15] text-white">
                Local shopping just got easier.
              </Heading>
            </Section>

            <Section className="px-6 py-7">
              <Text className="m-0 text-[12px] leading-7 text-slate-700">
                Welcome. Thanks for joining Sellee. We are building a modern
                marketplace where customers can discover nearby products and
                vendors can sell with personalized store and   simple WhatsApp-integrated features.
              </Text>
              <Text className="mb-0 mt-4 text-[12px] leading-7 text-slate-700">
                {roleCopy}
              </Text>

              <Section className="py-7 text-center">
                <Button
                  href={marketplaceUrl}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-[12px] font-bold text-white"
                >
                  Explore the Marketplace
                </Button>
              </Section>

              <Section className="rounded-[14px] bg-emerald-50 px-5 py-4">
                <Text className="m-0 text-[11px] font-bold text-emerald-800">
                  What you can do next
                </Text>
                <Text className="mb-0 mt-2 text-[11px] leading-6 text-emerald-900">
                  Browse products, save trusted stores, start orders through
                  WhatsApp, and keep your local commerce activity organized in
                  one place.
                </Text>
                <Text className="mb-0 mt-2 text-[11px] leading-6 text-emerald-900">
                  Infact everything still happen through whatsapp without any hassle
                  just like you normally do but with a touch of professionalism.
                </Text>
              </Section>

              <Hr className="my-6 border-slate-200" />
              <Text className="m-0 text-[10px] leading-5 text-slate-500">
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