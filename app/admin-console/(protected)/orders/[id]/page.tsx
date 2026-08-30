import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatNaira } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Order detail" };

interface OrderItemRow {
  id: string;
  quantity: number;
  unit_price: number;
  product: { id: string; name: string; image_url: string | null } | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_whatsapp, status, total_amount, payment_method, created_at, store:store_id(id, name, slug, whatsapp_number)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const store = Array.isArray(order.store) ? order.store[0] : order.store;

  const [{ data: items }, { data: payment }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, quantity, unit_price, product:product_id(id, name, image_url)")
      .eq("order_id", id),
    supabase
      .from("payments")
      .select("method, status, receipt_url, verified_at, created_at")
      .eq("order_id", id)
      .maybeSingle(),
  ]);

  const normalizedItems = ((items ?? []) as Array<Record<string, unknown>>).map((row) => {
    const rawProduct = row.product;
    const product = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct;
    return {
      id: row.id as string,
      quantity: row.quantity as number,
      unit_price: row.unit_price as number,
      product: (product as OrderItemRow["product"]) ?? null,
    };
  });

  return (
    <div className="max-w-3xl">
      <Link href="/admin-console/orders" className="text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
        ← Back to orders
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="atlas-kicker">Order</p>
          <h1 className="atlas-display mb-0 mt-1 text-[24px] font-medium">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
        </div>
        <span className="atlas-badge" data-tone="neutral">
          {order.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="atlas-panel p-4">
          <p className="atlas-kicker mb-2">Store</p>
          <p className="text-[13px] font-medium">{store?.name ?? "—"}</p>
          {store?.slug ? (
            <Link
              href={`/v/${store.slug}`}
              target="_blank"
              className="text-[11.5px]"
              style={{ color: "var(--atlas-brass-strong)" }}
            >
              View storefront ↗
            </Link>
          ) : null}
        </section>

        <section className="atlas-panel p-4">
          <p className="atlas-kicker mb-2">Customer</p>
          <p className="text-[13px] font-medium">{order.customer_name || "—"}</p>
          <p className="atlas-figure text-[12px]" style={{ color: "var(--atlas-text-muted)" }}>
            {order.customer_whatsapp}
          </p>
        </section>

        <section className="atlas-panel p-4">
          <p className="atlas-kicker mb-2">Payment</p>
          <p className="text-[13px] font-medium">{order.payment_method ?? payment?.method ?? "—"}</p>
          {payment ? (
            <p className="text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              {payment.status}
              {payment.verified_at ? ` · verified ${formatDateTime(payment.verified_at)}` : ""}
            </p>
          ) : null}
        </section>

        <section className="atlas-panel p-4">
          <p className="atlas-kicker mb-2">Placed</p>
          <p className="atlas-figure text-[13px]">{formatDateTime(order.created_at)}</p>
        </section>
      </div>

      <section className="mt-6">
        <p className="atlas-kicker mb-2">Items</p>
        <div className="atlas-panel divide-y" style={{ borderColor: "var(--atlas-line)" }}>
          {normalizedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px]">{item.product?.name ?? "Unknown product"}</p>
                <p className="atlas-figure text-[11.5px]" style={{ color: "var(--atlas-text-muted)" }}>
                  {item.quantity} × {formatNaira(Number(item.unit_price))}
                </p>
              </div>
              <p className="atlas-figure text-[13px]">
                {formatNaira(Number(item.unit_price) * Number(item.quantity))}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] font-medium">Total</p>
            <p className="atlas-figure text-[13px] font-medium">{formatNaira(Number(order.total_amount))}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
