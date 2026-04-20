import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Sellee",
  description: "Sellee terms of service",
};

const effectiveDate = "April 20, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Sellee Legal</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-600">Effective date: {effectiveDate}</p>
      </header>

      <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Acceptance</h2>
          <p>
            By accessing or using Sellee, you agree to these Terms of Service.
            If you do not agree, do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Service Scope</h2>
          <p>
            Sellee provides tools for storefront management, product listing,
            order tracking, and WhatsApp-assisted communication workflows.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Account Responsibilities</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You are responsible for account credentials and account activity.</li>
            <li>You must provide accurate business and contact information.</li>
            <li>You must comply with applicable laws and messaging platform policies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Prohibited Use</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Spam, fraudulent activity, or deceptive communications.</li>
            <li>Violations of WhatsApp, payment, or hosting provider policies.</li>
            <li>Attempts to compromise platform security or abuse system resources.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Fees and Billing</h2>
          <p>
            Paid features may be introduced over time. Any pricing, billing terms,
            and trial terms will be shown before purchase or renewal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Availability and Changes</h2>
          <p>
            We may update, suspend, or discontinue parts of the service, with or
            without notice, as needed for maintenance, legal compliance, or product
            changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Limitation of Liability</h2>
          <p>
            Sellee is provided on an &quot;as is&quot; basis. To the maximum extent
            permitted by law, we are not liable for indirect, incidental, or
            consequential damages arising from service use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Termination</h2>
          <p>
            We may suspend or terminate access for violations of these terms,
            platform abuse, or legal requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">9. Contact</h2>
          <p>
            Contact: <a href="mailto:support@sellee.app" className="font-medium text-sky-700 hover:underline">support@sellee.app</a>
          </p>
        </section>
      </article>

      <p className="text-xs text-slate-500">
        Also see <Link href="/privacy" className="text-sky-700 hover:underline">Privacy Policy</Link> and <Link href="/data-deletion" className="text-sky-700 hover:underline">Data Deletion Instructions</Link>.
      </p>
    </main>
  );
}

