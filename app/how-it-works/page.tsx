import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UploadCloud,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "See how Sellee works for vendors and customers, from storefront setup and product discovery to WhatsApp-powered orders and updates.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How It Works | Sellee",
    description:
      "A simple guide to how vendors sell and customers shop through Sellee's local marketplace and WhatsApp workflows.",
    url: "https://sellee.store/how-it-works",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | Sellee",
    description:
      "A simple guide to how vendors sell and customers shop through Sellee's local marketplace and WhatsApp workflows.",
  },
};

const vendorSteps = [
  {
    title: "Create your store",
    description:
      "Set your store name, location, WhatsApp contact, visual identity, and business details from the vendor dashboard.",
    icon: Store,
  },
  {
    title: "Add products",
    description:
      "Upload product names, prices, categories, photos, descriptions, and stock details so customers know what is available.",
    icon: UploadCloud,
  },
  {
    title: "Receive orders",
    description:
      "Customers browse your public storefront or marketplace listings, then start an order conversation through WhatsApp.",
    icon: MessageCircle,
  },
  {
    title: "Manage updates",
    description:
      "Use order status, broadcasts, reviews, and WhatsApp automation to keep customers informed and coming back.",
    icon: PackageCheck,
  },
];

const customerSteps = [
  {
    title: "Search locally",
    description:
      "Find products, categories, and nearby vendors using marketplace search, filters, and location-aware discovery.",
    icon: Search,
  },
  {
    title: "Compare stores",
    description:
      "Check product photos, prices, store details, ratings, followers, and location before choosing who to buy from.",
    icon: ShieldCheck,
  },
  {
    title: "Order on WhatsApp",
    description:
      "Open a familiar WhatsApp conversation with the vendor and continue the purchase without learning a new checkout flow.",
    icon: ShoppingBag,
  },
  {
    title: "Follow favorites",
    description:
      "Save trusted vendors, track orders, discover new items, and return to the stores you already like.",
    icon: Heart,
  },
];

const sharedFlow = [
  {
    label: "Browse",
    description: "Customer discovers a product from search, store pages, or nearby vendor lists.",
  },
  {
    label: "Chat",
    description: "The order moves into WhatsApp where customer and vendor can confirm details.",
  },
  {
    label: "Fulfill",
    description: "Vendor tracks the order and sends updates as the product is prepared or delivered.",
  },
  {
    label: "Return",
    description: "Reviews, follows, broadcasts, and saved stores help the relationship continue.",
  },
];

const imageStories = [
  {
    title: "Vendor view",
    image:
      "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=82",
    alt: "A business owner reviewing online orders on a laptop",
    caption:
      "A vendor turns everyday inventory into a searchable store customers can trust before they send a message.",
  },
  {
    title: "Customer view",
    image:
      "https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?auto=format&fit=crop&w=900&q=82",
    alt: "A customer shopping online with a mobile phone",
    caption:
      "A customer discovers products, compares store details, and continues the order in a familiar chat experience.",
  },
];

export default function HowItWorksPage() {
  const howItWorksJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Sellee works",
    description:
      "Sellee helps vendors publish storefronts and customers discover products before ordering through WhatsApp.",
    step: sharedFlow.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.label,
      text: step.description,
    })),
  };

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-8 lg:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howItWorksJsonLd) }}
      />

      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <p className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              How it works
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Sellee connects local stores, products, and WhatsApp orders in one flow.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Vendors get a polished storefront and order tools. Customers get a
              faster way to discover nearby products and continue the purchase
              through a familiar WhatsApp conversation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/become-vendor"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold transition hover:bg-emerald-700"
              >
                <span className="text-white">Start selling</span>
                <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Shop marketplace
              </Link>
            </div>
          </div>

          <div className="relative min-h-[390px] overflow-hidden bg-slate-950 sm:min-h-[460px] lg:min-h-full">
            <Image
              src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=1200&q=82"
              alt="Local commerce team preparing online orders and messages"
              fill
              priority
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover opacity-78"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-emerald-950/10" />
            <div className="absolute inset-x-4 bottom-4 rounded-3xl border border-white/15 bg-white/95 p-4 shadow-sm backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Image description
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    A modern local selling workflow: products are prepared,
                    orders are organized, and customer conversations continue
                    through WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JourneyPanel
          eyebrow="For vendors"
          title="Turn your store into an always-open catalog."
          description="Sellee gives vendors the tools to publish products, receive demand, and keep order communication simple."
          steps={vendorSteps}
        />
        <JourneyPanel
          eyebrow="For customers"
          title="Find trusted sellers before starting the chat."
          description="Customers can browse, compare, and choose confidently before moving the order to WhatsApp."
          steps={customerSteps}
        />
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            The shared order loop
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Both sides meet in a simple marketplace-to-WhatsApp workflow.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Sellee keeps discovery public and organized, then lets the order
            conversation stay personal and direct.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sharedFlow.map((step, index) => (
            <article
              key={step.label}
              className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-emerald-700 shadow-sm">
                  {index + 1}
                </span>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{step.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {imageStories.map((story) => (
          <article
            key={story.title}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] bg-slate-100 sm:aspect-[16/10]">
              <Image
                src={story.image}
                alt={story.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {story.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {story.caption}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                What makes it smoother
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                Clear context before the first message.
              </h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Customers see enough information to make a decision. Vendors receive
            better-qualified requests because the product, store, and order
            context are already visible.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={MapPin}
            title="Nearby discovery"
            description="Customers can find vendors around their location and shop with more confidence."
          />
          <FeatureCard
            icon={MessageCircle}
            title="Chat commerce"
            description="Orders continue in WhatsApp, where many customers and vendors already coordinate."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Trust signals"
            description="Ratings, follows, storefront details, and product photos help reduce uncertainty."
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-600 text-white shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50">
              Ready to try it?
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Start from either side of the marketplace.
            </h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50">
              Sell with a sharper storefront, or shop from local vendors who
              are easier to discover and contact.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/become-vendor"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold transition hover:bg-emerald-50"
            >
              <span className="text-emerald-700">Become a vendor</span>
            </Link>
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore vendors
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

type JourneyStep = {
  title: string;
  description: string;
  icon: typeof Store;
};

function JourneyPanel({
  eyebrow,
  title,
  description,
  steps,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: JourneyStep[];
}) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>

      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article
              key={step.title}
              className="grid grid-cols-[44px_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Store;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}
