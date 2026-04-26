import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { WhatsAppLinkingCard } from "@/components/dashboard/whatsapp-linking-card";
import { authOptions } from "@/lib/auth";
import { getVendorWhatsAppLinkStatus } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Integrations",
};

export default async function DashboardIntegrationsPage() {
  const session = await getServerSession(authOptions);
  const whatsappLinkStatus = session?.user?.id
    ? await getVendorWhatsAppLinkStatus(session.user.id)
    : { linked: null, pending_code: null };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-sky-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Integrations</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          WhatsApp Bot Connection
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Link your operator number in under a minute: generate code, send LINK command, then refresh status.
        </p>
      </header>
      <WhatsAppLinkingCard initialStatus={whatsappLinkStatus} />
    </section>
  );
}
