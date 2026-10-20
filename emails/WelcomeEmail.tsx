import { EmailShell } from "./components/EmailShell";
import { P, PrimaryButton, Steps, SubTitle, Title } from "./components/parts";
import { firstNameOf } from "./components/tokens";

export interface WelcomeEmailProps {
  name?: string | null;
  marketplaceUrl?: string;
  /** Where vendors land to set up their store. */
  dashboardUrl?: string;
  role?: "vendor" | "customer";
}

const VENDOR_STEPS = [
  { title: "Set up your store", body: "Add your logo, pick a template and choose your colours." },
  { title: "List your products", body: "Photos, prices and stock. Customers browse them on your store page." },
  { title: "Share your link", body: "Customers tap order and the conversation continues on your WhatsApp." },
];

const CUSTOMER_STEPS = [
  { title: "Find a store you like", body: "Browse vendors and products near you, or search for something specific." },
  { title: "Order on WhatsApp", body: "Tap order and message the vendor directly to confirm the details." },
  { title: "Follow your favourites", body: "Follow a store to hear when it adds new items or has an offer." },
];

export default function WelcomeEmail({
  name,
  marketplaceUrl = "https://sellee.store/marketplace",
  dashboardUrl = "https://sellee.store/dashboard",
  role = "customer",
}: WelcomeEmailProps) {
  const firstName = firstNameOf(name);
  const isVendor = role === "vendor";

  return (
    <EmailShell previewText={isVendor ? "Your Sellee account is ready. Here is how to get your store live." : "Your Sellee account is ready."}>
      <Title>Welcome to Sellee, {firstName}.</Title>
      <P>
        {isVendor
          ? "Your account is ready. Sellee gives your business a proper online storefront while orders keep happening where your customers already are: WhatsApp."
          : "Your account is ready. Sellee helps you discover trusted local vendors and order from them on WhatsApp, the way you already shop."}
      </P>

      <PrimaryButton href={isVendor ? dashboardUrl : marketplaceUrl}>{isVendor ? "Set up your store" : "Browse the marketplace"}</PrimaryButton>

      <SubTitle>{isVendor ? "Getting started" : "How it works"}</SubTitle>
      <Steps items={isVendor ? VENDOR_STEPS : CUSTOMER_STEPS} />
    </EmailShell>
  );
}

WelcomeEmail.PreviewProps = { name: "Amaka Obi", role: "customer" } satisfies WelcomeEmailProps;
