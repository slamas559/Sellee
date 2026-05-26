import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn how Sellee helps local vendors turn WhatsApp conversations into organized storefronts, product discovery, orders, and customer relationships.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us | Sellee",
    description:
      "Sellee connects customers with trusted nearby vendors and gives sellers WhatsApp-powered tools for modern local commerce.",
    url: "https://sellee.store/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | Sellee",
    description:
      "Sellee connects customers with trusted nearby vendors and gives sellers WhatsApp-powered tools for modern local commerce.",
  },
};

const principles = [
  {
    title: "Local first",
    description:
      "We make nearby stores easier to find, compare, follow, and buy from without forcing customers into complicated checkout flows.",
    icon: MapPin,
  },
  {
    title: "WhatsApp native",
    description:
      "Sellee fits the way many vendors already sell: conversations, quick product updates, order confirmations, and status messages.",
    icon: MessageCircle,
  },
  {
    title: "Trust by design",
    description:
      "Store pages, reviews, product details, stock signals, and clear order records help both sides trade with more confidence.",
    icon: ShieldCheck,
  },
];

const workflow = [
  "Vendor creates a polished store profile",
  "Products become searchable in the marketplace",
  "Customers discover nearby items and trusted stores",
  "Orders and updates continue through WhatsApp",
];

const stats = [
  { value: "1", label: "storefront link for every vendor" },
  { value: "24/7", label: "catalog access for customers" },
  { value: "0", label: "heavy setup needed to begin" },
];

export default function AboutPage() {
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Sellee",
    url: "https://sellee.store/about",
    description:
      "Sellee is a local marketplace and WhatsApp-powered selling platform for vendors and customers.",
    mainEntity: {
      "@type": "Organization",
      name: "Sellee",
      url: "https://sellee.store",
      logo: "https://sellee.store/icon.png",
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-2 py-4 sm:px-3 sm:py-6 lg:gap-8 lg:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <p className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              About Sellee
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              We are building the storefront layer for WhatsApp commerce.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Sellee helps local vendors look credible online, organize their
              catalogs, get discovered by nearby customers, and keep the buying
              conversation where it already happens: WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold transition hover:bg-emerald-700"
              >
                <span className="text-white">
                  Browse marketplace
                </span>
                <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
              </Link>
              <Link
                href="/become-vendor"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Become a vendor
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden bg-slate-950 sm:min-h-[440px] lg:min-h-full">
            <Image
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=82"
              alt="Vendor preparing products for online customer orders"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover opacity-80"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-emerald-900/10" />
            <div className="absolute inset-x-4 bottom-4 grid gap-3 sm:inset-x-6 sm:bottom-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/15 bg-white/92 p-4 shadow-sm backdrop-blur"
                >
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Why we exist
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Local selling should feel organized, trusted, and fast.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Many small businesses already win customers through chat, referrals,
            and repeat relationships. Sellee gives that same selling motion a
            modern public storefront, searchable products, location-aware
            discovery, and cleaner order workflows.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <article
                key={principle.title}
                className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {principle.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              How Sellee works
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              One simple path from product discovery to customer conversation.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              We connect the pieces that usually live in different places:
              catalog, location, store trust, product availability, and WhatsApp
              order communication.
            </p>
          </div>

          <div className="grid gap-3">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-emerald-700 shadow-sm">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-800">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Store className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">For vendors</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a public store, showcase products, receive orders, manage
            stock signals, and keep customers updated from a practical dashboard.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <ShoppingBag className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">For customers</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Find products, compare nearby stores, follow favorite vendors, read
            ratings, and order without learning a new shopping habit.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Bot className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">For operations</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            WhatsApp-powered workflows help with product discovery, order
            updates, broadcasts, and repeat engagement as stores grow.
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-600 text-white shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-50">
              <Users className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                Built for real commerce
              </p>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              Sellee helps vendors show up professionally before the first chat.
            </h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50">
              A clean storefront builds confidence. A searchable marketplace
              creates reach. A WhatsApp workflow keeps the relationship personal.
            </p>
          </div>
          <Link
            href="/vendors"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold transition hover:bg-emerald-50"
          >
            <span className="text-emerald-700">
              Explore vendors
            </span>
            <ArrowRight className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
