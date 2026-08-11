import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowRight, BarChart3, MapPin, MessageCircle, Sparkles, Store } from "lucide-react";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = { title: "Become a Vendor" };

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
];

export default async function BecomeVendorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-vendor");
  if (session.user.role === "vendor") redirect("/dashboard/store");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-24 sm:px-6 sm:pb-20 lg:pt-28">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 shadow-sm">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" /> Sell with Sellee
            </p>
            <h1 className="mt-5 max-w-xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Bring your store to more customers.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Turn your business into a discoverable online storefront—visible to shoppers near you and to new customers beyond your usual WhatsApp circle.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/become-vendor/setup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold transition hover:bg-emerald-700">
                <span className="text-white">Set up my store</span> <ArrowRight className="h-4 w-4 text-white" />
              </Link>
              <p className="text-sm text-slate-500">It only takes a few store details to begin.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
            <p className="text-sm font-bold text-slate-900">What you&apos;ll get</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />A public store page you can share anywhere.</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />Local discovery for shoppers looking nearby.</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />A simple dashboard for products and orders.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Built for growing businesses</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">More visibility, with a familiar way to sell.</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <div className="inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-950 px-6 py-6 text-white sm:flex-row sm:items-center sm:px-8">
        <div><h2 className="text-lg font-bold">Ready to put your store on Sellee?</h2><p className="mt-1 text-sm text-slate-300">Complete your store details and start adding products.</p></div>
        <Link href="/become-vendor/setup" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-emerald-50"><span className="text-slate-900 ">Proceed to store settings </span><ArrowRight className="h-4 w-4 text-slate-900" /></Link>
      </section>
    </main>
  );
}
