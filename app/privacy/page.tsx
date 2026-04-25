import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Sellee privacy policy",
};

const effectiveDate = "April 20, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Sellee Legal</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-600">Effective date: {effectiveDate}</p>
      </header>

      <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Introduction</h2>
          <p>
            Sellee helps vendors create online store pages and manage orders with
            WhatsApp-powered messaging workflows. This policy explains what data we
            collect, why we collect it, and how we handle it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Information We Collect</h2>
          <p>We may collect and store:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account data (email, password hash, phone number, role).</li>
            <li>Store data (store name, slug, WhatsApp number, logo URL, theme settings).</li>
            <li>Product data (name, description, price, images, stock).</li>
            <li>Order data (customer name, customer WhatsApp, items, totals, status).</li>
            <li>Payment and receipt metadata when enabled.</li>
            <li>WhatsApp automation metadata needed to process commands and updates.</li>
            <li>Technical logs for security, debugging, and abuse prevention.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. How We Use Information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To provide and maintain Sellee services.</li>
            <li>To process store operations, orders, and status updates.</li>
            <li>To support WhatsApp command handling and notifications.</li>
            <li>To improve reliability, security, and performance.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Data Sharing</h2>
          <p>
            We do not sell personal data. We may share data with infrastructure and
            service providers required to operate Sellee, such as hosting,
            database, storage, and messaging providers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Data Retention</h2>
          <p>
            We retain data only as long as needed for service operation, legal
            compliance, dispute resolution, and security monitoring.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Security</h2>
          <p>
            We apply reasonable technical and organizational safeguards. No internet
            transmission or storage system is guaranteed to be fully secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Your Rights</h2>
          <p>
            You may request access, correction, or deletion of your information.
            Please contact us using the details below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Contact</h2>
          <p>
            Contact: <a href="mailto:support@sellee.app" className="font-medium text-sky-700 hover:underline">support@sellee.app</a>
          </p>
        </section>
      </article>

      <p className="text-xs text-slate-500">
        Also see <Link href="/terms" className="text-sky-700 hover:underline">Terms of Service</Link> and <Link href="/data-deletion" className="text-sky-700 hover:underline">Data Deletion Instructions</Link>.
      </p>
    </main>
  );
}

