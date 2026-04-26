import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AccountProfileForm } from "@/components/dashboard/account-profile-form";
import { CustomerFollowsManager } from "@/components/account/customer-follows-manager";
import { authOptions } from "@/lib/auth";
import { getCustomerFollows, getCustomerOrders } from "@/lib/dashboard-data";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = {
  title: "Account",
};

type AccountSearchParams = Promise<{
  status?: string;
  q?: string;
}>;

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: AccountSearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const params = await searchParams;
  const selectedStatus = (params.status ?? "all").toLowerCase();
  const orderRefQuery = (params.q ?? "").trim().toUpperCase();

  const orders = await getCustomerOrders(session.user.id);
  const follows = await getCustomerFollows(session.user.id);
  const pendingCount = orders.filter((item) => item.order.status === "pending_whatsapp").length;
  const confirmedCount = orders.filter((item) => item.order.status === "confirmed").length;

  const filteredOrders = orders.filter((entry) => {
    const statusPass = selectedStatus === "all" ? true : entry.order.status === selectedStatus;
    const refPass = orderRefQuery
      ? entry.order.id.slice(0, 8).toUpperCase().includes(orderRefQuery) ||
        entry.order.id.toUpperCase().includes(orderRefQuery)
      : true;
    return statusPass && refPass;
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-3 py-6 sm:px-4 sm:py-8">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Profile & Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your personal details, WhatsApp ordering contact, and role settings.
        </p>
      </header>
      <AccountProfileForm />
      <CustomerFollowsManager initialFollows={follows} />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-emerald-700">My Orders</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Track Purchases</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
              Pending: {pendingCount}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
              Confirmed: {confirmedCount}
            </span>
          </div>
        </div>

        <form className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
          <select
            name="status"
            defaultValue={selectedStatus}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
          >
            <option value="all">All statuses</option>
            <option value="pending_whatsapp">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            name="q"
            defaultValue={orderRefQuery}
            placeholder="Track by order ref (e.g. ABCD1234)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
          />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Filter
          </button>
        </form>

        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No matching orders found for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((entry) => (
              <article key={entry.order.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      #{entry.order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      entry.order.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : entry.order.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {formatOrderStatus(entry.order.status)}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    Store:{" "}
                    {entry.store ? (
                      <Link href={`/store/${entry.store.slug}`} className="font-medium text-emerald-700 hover:underline">
                        {entry.store.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-700">Unknown store</span>
                    )}
                  </p>
                  <p>Total: <span className="font-semibold text-slate-900">{formatNaira(Number(entry.order.total_amount ?? 0))}</span></p>
                </div>

                {entry.items.length > 0 ? (
                  <ul className="mt-3 space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                    {entry.items.map((item, index) => (
                      <li key={`${entry.order.id}-${item.product_name}-${index}`} className="flex justify-between gap-2">
                        <span className="line-clamp-1">
                          {item.product_name} x{item.quantity}
                        </span>
                        <span className="shrink-0 font-medium">{formatNaira(item.unit_price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
