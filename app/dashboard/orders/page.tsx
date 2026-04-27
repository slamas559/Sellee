import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { formatNaira } from "@/lib/format";
import { authOptions } from "@/lib/auth";
import { getVendorOrders, getVendorWhatsAppLinkStatus } from "@/lib/dashboard-data";
import { OrderStatusActions } from "@/components/dashboard/order-status-actions";

export const metadata: Metadata = {
  title: "Orders",
};

function statusClass(status: string): string {
  if (status === "confirmed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  if (status === "delivered") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default async function DashboardOrdersPage() {
  const session = await getServerSession(authOptions);
  const orders = session?.user?.id ? await getVendorOrders(session.user.id) : [];
  const linkStatus = session?.user?.id
    ? await getVendorWhatsAppLinkStatus(session.user.id)
    : { linked: null, pending_code: null };
  const isLinked = Boolean(linkStatus.linked?.is_active);
  const confirmedCount = orders.filter((item) => item.order.status === "confirmed").length;
  const pendingCount = orders.filter((item) => item.order.status === "pending_whatsapp").length;
  const totalRevenue = orders.reduce(
    (sum, item) =>
      item.order.status === "confirmed"
        ? sum + Number(item.order.total_amount ?? 0)
        : sum,
    0,
  );
  const pendingValue = orders.reduce(
    (sum, item) =>
      item.order.status === "pending_whatsapp"
        ? sum + Number(item.order.total_amount ?? 0)
        : sum,
    0,
  );

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Orders</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900">WhatsApp Order Requests</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isLinked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isLinked ? "Linked" : "Unlinked"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Every click on &quot;Order via WhatsApp&quot; is logged here with pending status.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Orders</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{orders.length}</h2>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Confirmed</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{confirmedCount}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Revenue: {formatNaira(totalRevenue)}
          </p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-900/80">Pending</p>
          <h2 className="mt-1 text-2xl font-black text-amber-950">{pendingCount}</h2>
          <p className="mt-1 text-xs text-amber-900/80">
            Pending value: {formatNaira(pendingValue)}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {orders.length === 0 ? (
          <p className="text-sm text-slate-600">
            No orders yet. Share your store link and place a test order.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map(({ order, items }) => (
              <article key={order.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-1 text-sm text-slate-700">
                  <p>
                    Customer: <span className="font-medium">{order.customer_name ?? "Not provided"}</span>
                  </p>
                  <p>
                    WhatsApp: <span className="font-medium">{order.customer_whatsapp}</span>
                  </p>
                  <p>
                    Total: <span className="font-semibold">{formatNaira(Number(order.total_amount))}</span>
                  </p>
                </div>

                {order.status === "pending_whatsapp" ? (
                  <OrderStatusActions orderId={order.id} />
                ) : null}

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {items.map((item, index) => (
                      <li key={`${order.id}-${index}`}>
                        {item.product_name} x{item.quantity} @ {formatNaira(item.unit_price)}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
