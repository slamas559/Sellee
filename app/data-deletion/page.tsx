import Link from "next/link";

export const metadata = {
  title: "Data Deletion Instructions",
  description: "How to request account and data deletion on Sellee",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Sellee Legal</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Data Deletion Instructions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use these steps to request deletion of your Sellee account data.
        </p>
      </header>

      <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">How to Request Deletion</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Send an email to <a href="mailto:support@sellee.app" className="font-medium text-sky-700 hover:underline">support@sellee.app</a>.</li>
            <li>Use subject: <span className="font-medium">Data Deletion Request</span>.</li>
            <li>Include your account email and registered phone number.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">What We Delete</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account profile data linked to your identity.</li>
            <li>Store and product records owned by your account.</li>
            <li>Order-related data and linked operational metadata where permitted.</li>
            <li>WhatsApp linking records associated with your vendor account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
          <p>
            Verified deletion requests are processed within 30 days, except where
            longer retention is legally required (for example fraud prevention,
            security investigations, or tax/legal compliance).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Verification</h2>
          <p>
            We may ask for additional verification to protect accounts from
            unauthorized deletion requests.
          </p>
        </section>
      </article>

      <p className="text-xs text-slate-500">
        Also see <Link href="/privacy" className="text-sky-700 hover:underline">Privacy Policy</Link> and <Link href="/terms" className="text-sky-700 hover:underline">Terms of Service</Link>.
      </p>
    </main>
  );
}

