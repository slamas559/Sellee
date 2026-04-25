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
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Integrations</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">
          WhatsApp Bot Connection
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Link your vendor WhatsApp number and manage command access.
        </p>
      </header>
      <WhatsAppLinkingCard initialStatus={whatsappLinkStatus} />
    </section>
  );
}
