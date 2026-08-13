import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Camera,
  MapPin,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Reveal } from "@/components/become-vendor/reveal";

export const metadata: Metadata = { title: "Become a Vendor" };

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1652690528311-98bda62b2daf?auto=format&fit=crop&w=2400&q=80";

const CTA_IMAGE =
  "https://images.unsplash.com/photo-1685883518161-63ccb05aef83?auto=format&fit=crop&w=2200&q=80";

const categories = [
  {
    label: "Phones & gadgets",
    tagline: "Smartphones, earbuds, chargers, accessories",
    image:
      "https://images.pexels.com/photos/11297769/pexels-photo-11297769.jpeg",
    icon: Smartphone,
  },
  {
    label: "Fashion & style",
    tagline: "Clothing, shoes, bags, jewelry, fabrics",
    image:
      "https://images.unsplash.com/photo-1598600815245-f806c8259e1e?auto=format&fit=crop&w=1400&q=80",
    icon: Shirt,
  },
  {
    label: "Groceries & foodstuff",
    tagline: "Provisions, fresh produce, everyday meals",
    image:
      "https://images.pexels.com/photos/30848031/pexels-photo-30848031.jpeg",
    icon: ShoppingBasket,
  },
  {
    label: "Everything else",
    tagline: "Beauty, home goods, gifts, and more",
    image:
      "https://images.unsplash.com/photo-1637068088888-328ff239c689?auto=format&fit=crop&w=1400&q=80",
    icon: Store,
  },
];

const benefits = [
  {
    icon: MapPin,
    title: "Reach shoppers nearby",
    description: "Help customers in your area discover what you sell when they browse Sellee.",
  },
  {
    icon: Sparkles,
    title: "Go beyond your contacts",
    description: "Your storefront can be found by people outside your WhatsApp contact list and local network.",
  },
  {
    icon: Store,
    title: "Create your own storefront",
    description: "Show your products, prices, photos, location, and brand in one shareable store page.",
  },
  {
    icon: MessageCircle,
    title: "Keep selling on WhatsApp",
    description: "Customers can still continue orders in the WhatsApp chat flow you already know.",
  },
  {
    icon: BarChart3,
    title: "Manage sales simply",
    description: "Use your dashboard to manage products, incoming orders, and your store details.",
  },
  {
    icon: BadgeCheck,
    title: "Earn a verified badge",
    description: "Verify your WhatsApp number to unlock a trust badge that makes buyers feel confident ordering.",
  },
];

const steps = [
  {
    icon: Store,
    title: "Set up your storefront",
    description: "Add your store name, category, location, and a few details it only takes a few minutes.",
  },
  {
    icon: Camera,
    title: "List your products",
    description: "Upload clear photos, prices, and descriptions so shoppers know exactly what you're offering.",
  },
  {
    icon: Rocket,
    title: "Go live and start selling",
    description: "Your store becomes discoverable on Sellee, and orders can flow straight into WhatsApp.",
  },
];

function AnimatedHeadline({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="bv-word mr-[0.28em]"
          style={{ animationDelay: `${startDelay + i * 70}ms` }}
        >
          {word}
        </span>
      ))}
    </>
  );
}

export default async function BecomeVendorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-vendor");
  if (session.user.role === "vendor") redirect("/dashboard/store");

  return (
    <main className="w-full overflow-x-hidden pb-16 sm:pb-24">
      {/* ---------------- HERO ---------------- */}
      <section className="relative flex min-h-[86vh] w-full items-end overflow-hidden sm:min-h-[92vh]">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="A vibrant market where vendors sell everyday goods"
            fill
            priority
            sizes="100vw"
            className="bv-kenburns object-cover object-center"
          />
          {/* black transparent gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6 sm:pb-16 lg:pb-20">
          <p
            className="bv-fade-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm"
            style={{ animationDelay: "60ms" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Sell with Sellee
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
            <AnimatedHeadline text="Whatever you sell," startDelay={150} />
            <br />
            <span className="text-emerald-400">
              <AnimatedHeadline text="there's a customer" startDelay={700} />
            </span>
            <br />
            <AnimatedHeadline text="looking for it." startDelay={1250} />
          </h1>

          <p
            className="bv-fade-up mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg"
            style={{ animationDelay: "1550ms" }}
          >
            Gadgets, fashion, groceries, or anything in between — turn your business into a
            discoverable storefront that shoppers near you (and beyond your WhatsApp circle)
            can find, browse, and order from.
          </p>

          <div
            className="bv-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "1750ms" }}
          >
            <Link
              href="/become-vendor/setup"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400"
            >
              Set up my store
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <p className="text-sm text-white/70">Free to start. Only a few details needed.</p>
          </div>

          {/* floating category chips */}
          <div
            className="bv-fade-up mt-10 flex flex-wrap gap-2.5 sm:gap-3"
            style={{ animationDelay: "1900ms" }}
          >
            {[
              { icon: Smartphone, label: "Gadgets" },
              { icon: Shirt, label: "Fashion" },
              { icon: ShoppingBasket, label: "Groceries" },
              { icon: Store, label: "& more" },
            ].map(({ icon: Icon, label }, i) => (
              <span
                key={label}
                className="bv-float flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md sm:text-sm"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <Icon className="h-3.5 w-3.5 text-emerald-300" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* ---------------- CATEGORY SHOWCASE ---------------- */}
        <section className="mt-16 sm:mt-24">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              Built for every kind of seller
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              From tech to threads to the pantry Sellee has a shelf for it.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Sellee isn&apos;t just for one type of business. Vendors across categories are
              already building storefronts that customers can browse in seconds.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ label, tagline, image, icon: Icon }, i) => (
              <Reveal key={label} delay={i * 90}>
                <article className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <Image
                    src={image}
                    alt={label}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 300px"
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/0" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="mb-2 inline-flex rounded-lg bg-emerald-500/90 p-1.5 text-slate-950">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold leading-tight text-white">{label}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/80">{tagline}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- SPLIT: photo + copy ---------------- */}
        <section className="mt-20 grid items-center gap-8 sm:mt-28 lg:grid-cols-2 lg:gap-14">
          <Reveal className="order-2 lg:order-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              One storefront, every channel
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Discovery on Sellee. Orders on WhatsApp. All in your control.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Your storefront gives shoppers a real place to browse your catalog with photos,
              prices, and reviews while every order can still land in the WhatsApp chat you
              already use to run your business.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 sm:text-base">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                Optional vendor verification adds a trust badge to your store.
              </li>
              <li className="flex gap-3">
                <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                Track orders and manage your catalog from one simple dashboard.
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                Show up on the map for shoppers browsing vendors near them.
              </li>
            </ul>
          </Reveal>

          <Reveal className="order-1 lg:order-2" delay={120}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
              <Image
                src="https://images.unsplash.com/photo-1685875018148-6ac6d41b7c4e?auto=format&fit=crop&w=1600&q=80"
                alt="A well-organized clothing storefront ready for customers"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
            </div>
          </Reveal>
        </section>

        {/* ---------------- BENEFITS ---------------- */}
        <section className="mt-20 sm:mt-28">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              Built for growing businesses
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              More visibility, with a familiar way to sell.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 70}>
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
                  <div className="inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section className="mt-20 sm:mt-28">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              Getting started
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Three steps between you and your first order.
            </h2>
          </Reveal>

          <div className="relative mt-10 grid gap-6 sm:grid-cols-3">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent sm:block" />
            {steps.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div className="relative rounded-2xl bg-white p-5">
                  <div className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="mt-3 block text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="relative mx-auto mt-20 w-full max-w-6xl overflow-hidden rounded-3xl px-4 sm:mt-28 sm:px-6">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl">
            <div className="absolute inset-0">
              <Image
                src={CTA_IMAGE}
                alt="Customers browsing a busy marketplace"
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/75 to-emerald-950/70" />
            </div>

            <div className="relative z-10 flex flex-col items-start gap-5 px-6 py-12 sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="bv-pulse-ring inline-flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-950">
                  <Rocket className="h-3.5 w-3.5" /> Ready when you are
                </p>
                <h2 className="mt-4 max-w-xl text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                  Your customers are already searching. Let them find you.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/80 sm:text-base">
                  Set up your store today and start turning nearby shoppers into paying
                  customers whatever it is you sell.
                </p>
              </div>
              <Link
                href="/become-vendor/setup"
                className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-50"
              >
                Set up my store
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}