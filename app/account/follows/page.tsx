import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomerFollows } from "@/lib/dashboard-data";
import { storeUrl } from "@/lib/store-url";

export const metadata: Metadata = {
  title: "Followed Vendors",
};

export default async function FollowedVendorsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/follows");
  }

  const follows = await getCustomerFollows(session.user.id);

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Following</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Vendors You Follow</h1>
        <p className="mt-1 text-sm text-slate-600">Manage stores you follow to receive updates and broadcasts.</p>
      </header>

      {follows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p className="mb-3">You are not following any vendors yet.</p>
          <Link href="/marketplace" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Browse vendors</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {follows.map((store) => (
            <li key={store.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-md bg-slate-100" />
              )}
              <div>
                <Link href={storeUrl(store.slug)} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">{store.name}</Link>
                <p className="text-xs text-slate-500">{[store.city, store.state, store.country].filter(Boolean).join(", ")}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}