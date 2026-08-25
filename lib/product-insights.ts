import type { OrderRecord, ProductRecord } from "@/types";

export type ProductInsight = {
  productId: string;
  productName: string;
  views: number;
  uniqueViewers: number;
  unitsSold: number;
  ordersCount: number;
  /** Distinct orders / distinct viewers. 0 when there's no view data yet. */
  conversionRate: number;
  /** True when a product has enough views to trust the conversion number but is converting poorly. */
  needsAttention: boolean;
};

const MIN_VIEWERS_FOR_SIGNAL = 5;
const LOW_CONVERSION_THRESHOLD = 0.05; // 5%

/**
 * Combines product-detail view events with order line items to show, per product,
 * how much interest (views) is translating into sales (orders) — surfaces products
 * with real traffic but a conversion problem (pricing, photos, description, etc).
 */
export function computeProductInsights(
  visits: Array<{ product_id: string | null; visitor_id: string }>,
  orders: Array<{
    order: OrderRecord;
    items: Array<{ product_id?: string; product_name: string; quantity: number }>;
  }>,
  products: ProductRecord[],
): ProductInsight[] {
  const viewsByProduct = new Map<string, { views: number; viewers: Set<string> }>();

  for (const visit of visits) {
    if (!visit.product_id) continue;
    const entry = viewsByProduct.get(visit.product_id) ?? { views: 0, viewers: new Set<string>() };
    entry.views += 1;
    entry.viewers.add(visit.visitor_id);
    viewsByProduct.set(visit.product_id, entry);
  }

  const salesByProduct = new Map<string, { unitsSold: number; orderIds: Set<string> }>();

  for (const { order, items } of orders) {
    if (order.status !== "confirmed" && order.status !== "delivered") continue;
    for (const item of items) {
      if (!item.product_id) continue;
      const entry = salesByProduct.get(item.product_id) ?? { unitsSold: 0, orderIds: new Set<string>() };
      entry.unitsSold += item.quantity;
      entry.orderIds.add(order.id);
      salesByProduct.set(item.product_id, entry);
    }
  }

  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  // Union of every product that had a view or a sale in this period.
  const productIds = new Set<string>([...viewsByProduct.keys(), ...salesByProduct.keys()]);

  const insights: ProductInsight[] = [];

  for (const productId of productIds) {
    const viewEntry = viewsByProduct.get(productId);
    const saleEntry = salesByProduct.get(productId);

    const views = viewEntry?.views ?? 0;
    const uniqueViewers = viewEntry?.viewers.size ?? 0;
    const unitsSold = saleEntry?.unitsSold ?? 0;
    const ordersCount = saleEntry?.orderIds.size ?? 0;
    const conversionRate = uniqueViewers > 0 ? ordersCount / uniqueViewers : 0;
    const needsAttention = uniqueViewers >= MIN_VIEWERS_FOR_SIGNAL && conversionRate < LOW_CONVERSION_THRESHOLD;

    insights.push({
      productId,
      productName: productNameById.get(productId) ?? "Unknown product",
      views,
      uniqueViewers,
      unitsSold,
      ordersCount,
      conversionRate,
      needsAttention,
    });
  }

  return insights.sort((a, b) => b.views - a.views);
}