import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Hr,
  Link,
  Row,
  Column,
} from "@react-email/components";

export interface WelcomeEmailProps {
  name?: string | null;
  marketplaceUrl?: string;
  role?: "vendor" | "customer";
}

const vendorFeatures = [
  {
    icon: "🛍️",
    title: "Your own store page",
    body: "A shareable storefront at sellee.store/store/your-name — products, prices, and photos in one place.",
  },
  {
    icon: "📦",
    title: "Order management",
    body: "Confirm, reject, or mark orders as delivered from your dashboard or directly on WhatsApp.",
  },
  {
    icon: "📢",
    title: "Broadcast to followers",
    body: "Send restock alerts and promos to all your store followers in one tap.",
  },
];

const customerFeatures = [
  {
    icon: "🔍",
    title: "Discover local vendors",
    body: "Browse products from trusted sellers near you and compare stores before buying.",
  },
  {
    icon: "💬",
    title: "Order via WhatsApp",
    body: "No new apps needed — place orders through a familiar WhatsApp conversation.",
  },
  {
    icon: "📋",
    title: "Track your orders",
    body: "Get order confirmations and status updates automatically through WhatsApp.",
  },
];

export default function WelcomeEmail({
  name,
  marketplaceUrl = "https://sellee.store/marketplace",
  role = "customer",
}: WelcomeEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";
  const isVendor = role === "vendor";
  const features = isVendor ? vendorFeatures : customerFeatures;

  const heroCopy = isVendor
    ? "Your store is open. Now let's fill it."
    : "Local shopping, the way it should be.";

  const subCopy = isVendor
    ? "Build your storefront, list your products, and start receiving WhatsApp-powered orders from customers around you — all from one dashboard."
    : "Discover trusted vendors nearby, compare products, and order through WhatsApp. No new apps, no complicated checkout.";

  const ctaLabel = isVendor ? "Set Up Your Store →" : "Explore the Marketplace →";
  const ctaUrl = isVendor ? "https://sellee.store/dashboard/store" : marketplaceUrl;

  const ctaSupportCopy = isVendor
    ? "Your dashboard is waiting. Set up your store in under 5 minutes."
    : "Hundreds of local products are waiting to be discovered.";

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Welcome to Sellee, {firstName} — your local marketplace for WhatsApp commerce.
      </Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                emerald: {
                  50: "#ecfdf5",
                  600: "#059669",
                  700: "#047857",
                  800: "#065f46",
                  900: "#064e3b",
                },
              },
            },
          },
        }}
      >
        <Body className="m-0 bg-emerald-50 px-4 py-8 font-sans">

          <Container className="mx-auto w-full max-w-[600px] overflow-hidden rounded-3xl bg-white">

            {/* ── HEADER ── */}
            <Section
              className="px-12 pb-11 pt-12"
              style={{ background: "linear-gradient(145deg, #064e3b 0%, #065f46 40%, #047857 75%, #059669 100%)" }}
            >
              {/* Wordmark row */}
              <Row>
                <Column>
                  <table cellPadding={0} cellSpacing={0}>
                    <tr>
                      <td
                        className="rounded-xl bg-white text-center"
                        style={{ width: "34px", height: "34px", verticalAlign: "middle" }}
                      >
                        <Text className="m-0 text-lg font-black text-emerald-600" style={{ lineHeight: "34px" }}>
                          S
                        </Text>
                      </td>
                      <td style={{ paddingLeft: "10px", verticalAlign: "middle" }}>
                        <Text className="m-0 text-xl font-extrabold text-white" style={{ letterSpacing: "-0.3px" }}>
                          Sellee
                        </Text>
                      </td>
                    </tr>
                  </table>
                </Column>
                <Column className="text-right">
                  <Text
                    className="m-0 text-xs font-bold uppercase text-white"
                    style={{ opacity: 0.5, letterSpacing: "0.14em" }}
                  >
                    {isVendor ? "Vendor Account" : "Customer Account"}
                  </Text>
                </Column>
              </Row>

              {/* Eyebrow */}
              <Text
                className="mb-2 mt-10 text-xs font-semibold uppercase text-white"
                style={{ opacity: 0.6, letterSpacing: "0.14em" }}
              >
                Welcome, {firstName}
              </Text>

              {/* Headline */}
              <Heading
                as="h1"
                className="m-0 text-[34px] font-black leading-tight text-white"
                style={{ letterSpacing: "-0.5px" }}
              >
                {heroCopy}
              </Heading>

              {/* Badge pill */}
              <table cellPadding={0} cellSpacing={0} className="mt-6">
                <tr>
                  <td
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  >
                    <Text className="m-0 text-[13px] font-semibold text-white" style={{ opacity: 0.85 }}>
                      ⚡ WhatsApp-powered commerce
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* ── INTRO ── */}
            <Section className="px-12 pb-0 pt-10">
              <Text className="m-0 text-base leading-7 text-slate-600">
                {subCopy}
              </Text>
            </Section>

            {/* ── FEATURES ── */}
            <Section className="px-12 pb-0 pt-8">
              <Text
                className="mb-5 mt-0 text-[11px] font-bold uppercase text-emerald-600"
                style={{ letterSpacing: "0.14em" }}
              >
                What's included
              </Text>

              {features.map((feature, i) => (
                <table
                  key={feature.title}
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  className={`rounded-2xl bg-slate-50 ${i < features.length - 1 ? "mb-3" : ""}`}
                >
                  <tr>
                    <td
                      className="pl-5 pr-3 text-[22px]"
                      style={{ width: "52px", verticalAlign: "top", paddingTop: "20px", paddingBottom: "20px", lineHeight: 1 }}
                    >
                      {feature.icon}
                    </td>
                    <td style={{ padding: "20px 20px 20px 8px", verticalAlign: "top" }}>
                      <Text className="mb-1 mt-0 text-sm font-bold text-slate-900">
                        {feature.title}
                      </Text>
                      <Text className="m-0 text-[13px] leading-5 text-slate-500">
                        {feature.body}
                      </Text>
                    </td>
                  </tr>
                </table>
              ))}
            </Section>

            {/* ── CTA BLOCK ── */}
            <Section className="px-12 py-9">
              <table cellPadding={0} cellSpacing={0} width="100%">
                <tr>
                  <td
                    className="rounded-2xl px-8 py-8 text-center"
                    style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}
                  >
                    <Text className="mb-1 mt-0 text-lg font-black text-white">
                      Ready to get started?
                    </Text>
                    <Text className="mb-6 mt-0 text-sm leading-6 text-white" style={{ opacity: 0.75 }}>
                      {ctaSupportCopy}
                    </Text>
                    <table cellPadding={0} cellSpacing={0} className="mx-auto">
                      <tr>
                        <td className="rounded-full bg-white">
                          <Button
                            href={ctaUrl}
                            className="rounded-full px-8 py-3.5 text-[15px] font-bold text-emerald-700"
                          >
                            {ctaLabel}
                          </Button>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </Section>

            {/* ── FOOTER ── */}
            <Section className="border-t border-slate-100 bg-slate-50 px-12 py-7">
              <Row>
                <Column>
                  <Text className="m-0 text-[13px] font-bold text-slate-800">
                    Sellee
                  </Text>
                  <Text className="m-0 mt-0.5 text-xs text-slate-400">
                    Local commerce, powered by WhatsApp.
                  </Text>
                </Column>
                <Column className="text-right">
                  <Link
                    href="https://sellee.store"
                    className="text-xs font-semibold text-emerald-600 no-underline"
                  >
                    sellee.store
                  </Link>
                </Column>
              </Row>

              <Text className="mb-0 mt-5 text-xs leading-5 text-slate-400">
                You received this because you created a Sellee account. Need
                help? Reply to this email and our support team will get back to
                you.
              </Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}