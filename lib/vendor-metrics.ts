import type { OrderRecord } from "@/types";
import type { AnalyticsRange } from "@/lib/date-range";

export type VendorPeriodMetrics = {
  aov: number;
  settledOrderCount: number;
  uniqueCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  /** Share (0-1) of unique customers in the period who had ordered before. */
  repeatRate: number;
  /** Average ms from order placed -> confirmed. Null if no reliable data yet. */
  avgConfirmMs: number | null;
  /** Average ms from confirmed -> delivered. Null if no reliable data yet. */
  avgDeliveryMs: number | null;
};

function isSettled(status: string): boolean {
  return status === "confirmed" || status === "delivered";
}

/**
 * Computes AOV, new-vs-repeat customer split, and fulfillment-time averages for one period.
 *
 * @param orders Orders already scoped to the period (see getVendorOrders({ from, to })).
 * @param range The analytics range these orders belong to.
 * @param customerFirstOrderMap Each customer's earliest-ever confirmed/delivered order date
 *   for this store (see getVendorCustomerFirstOrderMap). Not needed for the "all" range.
 */
export function computeVendorPeriodMetrics(
  orders: Array<{ order: OrderRecord }>,
  range: AnalyticsRange,
  customerFirstOrderMap: Map<string, Date>,
): VendorPeriodMetrics {
  const settledOrders = orders.filter(({ order }) => isSettled(order.status));

  const revenue = settledOrders.reduce((sum, { order }) => sum + Number(order.total_amount ?? 0), 0);
  const aov = settledOrders.length > 0 ? revenue / settledOrders.length : 0;

  const customerPhones = new Set(settledOrders.map(({ order }) => order.customer_whatsapp));
  let newCustomers = 0;
  let repeatCustomers = 0;

  if (range.key === "all") {
    // No "before this period" boundary exists for all-time, so classify by order count
    // within this same all-time set: customers with 2+ settled orders are repeat.
    const countByPhone = new Map<string, number>();
    for (const { order } of settledOrders) {
      countByPhone.set(order.customer_whatsapp, (countByPhone.get(order.customer_whatsapp) ?? 0) + 1);
    }
    for (const count of countByPhone.values()) {
      if (count > 1) {
        repeatCustomers += 1;
      } else {
        newCustomers += 1;
      }
    }
  } else {
    for (const phone of customerPhones) {
      const firstOrderDate = customerFirstOrderMap.get(phone);
      if (firstOrderDate && range.from && firstOrderDate < range.from) {
        repeatCustomers += 1;
      } else {
        newCustomers += 1;
      }
    }
  }

  const uniqueCustomers = customerPhones.size;
  const repeatRate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

  // Exclude estimated (backfilled) timestamps — they're not real transition times.
  const confirmDurations = settledOrders
    .filter(({ order }) => order.confirmed_at && !order.confirmed_at_estimated)
    .map(
      ({ order }) =>
        new Date(order.confirmed_at as string).getTime() - new Date(order.created_at).getTime(),
    )
    .filter((ms) => ms >= 0);

  const deliveryDurations = orders
    .filter(
      ({ order }) =>
        order.status === "delivered" &&
        order.confirmed_at &&
        order.delivered_at &&
        !order.delivered_at_estimated,
    )
    .map(
      ({ order }) =>
        new Date(order.delivered_at as string).getTime() - new Date(order.confirmed_at as string).getTime(),
    )
    .filter((ms) => ms >= 0);

  const avgConfirmMs =
    confirmDurations.length > 0
      ? confirmDurations.reduce((a, b) => a + b, 0) / confirmDurations.length
      : null;
  const avgDeliveryMs =
    deliveryDurations.length > 0
      ? deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length
      : null;

  return {
    aov,
    settledOrderCount: settledOrders.length,
    uniqueCustomers,
    newCustomers,
    repeatCustomers,
    repeatRate,
    avgConfirmMs,
    avgDeliveryMs,
  };
}