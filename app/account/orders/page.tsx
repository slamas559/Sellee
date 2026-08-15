import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/dashboard-data";
import { formatNaira } from "@/lib/format";
import { storeUrl } from "@/lib/store-url";

export const metadata: Metadata = {
  title: "My Orders",
};

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function MyOrdersPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const params = await searchParams;
  const page = Number(params?.page ?? "1") || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const orders = await getCustomerOrders(session.user.id, { limit, offset });

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
      <header className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-amber-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">My Orders</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Orders made by you</h1>
        <p className="mt-1 text-sm text-slate-600">View recent purchases and track order status.</p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p className="mb-3">You have not placed any orders yet.</p>
          <Link href="/marketplace" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((entry) => (
            <article key={entry.order.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">#{entry.order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{new Date(entry.order.created_at).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  entry.order.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800"
                    : entry.order.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800"
                }`}>{formatOrderStatus(entry.order.status)}</span>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-slate-600">Store: {entry.store ? (
                    <Link href={storeUrl(entry.store.slug)} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
                      {entry.store.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-700">Unknown store</span>
                  )}</p>
                  <p className="mt-1 text-sm">Total: <span className="font-semibold text-slate-900">{formatNaira(Number(entry.order.total_amount ?? 0))}</span></p>

                  {entry.items.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {entry.items.map((item, idx) => (
                        <li key={`${entry.order.id}-${idx}`} className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="h-12 w-12 rounded-md object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-slate-100" />
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{item.product_name} x{item.quantity}</p>
                            <p className="text-xs text-slate-500">{formatNaira(item.unit_price * item.quantity)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={`/account/orders?page=${page - 1}`} className="rounded-md border px-3 py-2 text-sm">Previous</Link>
          ) : (
            <button disabled className="rounded-md border px-3 py-2 text-sm text-slate-400">Previous</button>
          )}
          {orders.length === limit ? (
            <Link href={`/account/orders?page=${page + 1}`} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Next</Link>
          ) : (
            <button disabled className="rounded-md border px-3 py-2 text-sm text-slate-400">Next</button>
          )}
        </div>
      </div>
    </main>
  );
}