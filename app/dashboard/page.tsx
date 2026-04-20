import Link from "next/link";
import { getServerSession } from "next-auth";
import { StoreSetupForm } from "@/components/dashboard/store-setup-form";
import { WhatsAppLinkingCard } from "@/components/dashboard/whatsapp-linking-card";
import { authOptions } from "@/lib/auth";
import { getVendorStore, getVendorWhatsAppLinkStatus } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const store = session?.user?.id ? await getVendorStore(session.user.id) : null;
  const whatsappLinkStatus = session?.user?.id
    ? await getVendorWhatsAppLinkStatus(session.user.id)
    : { linked: null, pending_code: null };

  return (
    <>
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Welcome, {session?.user?.email ?? "Vendor"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Set up your storefront details first, then start adding products.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Health Check</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">/api/health</h2>
          <p className="mt-1 text-sm text-slate-600">Confirms DB connectivity.</p>
          <a href="/api/health" className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
            Open endpoint
          </a>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Store Debug</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">/api/debug/store</h2>
          <p className="mt-1 text-sm text-slate-600">Returns your current store records.</p>
          <a href="/api/debug/store" className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
            Open endpoint
          </a>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Phase 2 Prep</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Dashboard Shell</h2>
          <p className="mt-1 text-sm text-slate-600">Products, Orders, and Analytics pages are scaffolded.</p>
          <Link href="/dashboard/products" className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
            Open products
          </Link>
        </article>
      </section>

      <StoreSetupForm initialStore={store} />
      <WhatsAppLinkingCard initialStatus={whatsappLinkStatus} />
    </>
  );
}
