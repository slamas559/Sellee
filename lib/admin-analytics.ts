import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// Same revenue definition already used on the vendor-facing analytics page
// (app/dashboard/analytics/page.tsx) - only orders that actually completed
// count as revenue, not ones still pending or cancelled.
const REVENUE_STATUSES = new Set(["confirmed", "delivered"]);

export type AnalyticsRangePreset =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "last_month"
  | "all"
  | "custom";

export interface ResolvedRange {
  start: Date | null; // null means "no lower bound" (the 'all' preset)
  end: Date;
  prevStart: Date | null;
  prevEnd: Date | null;
  hasComparison: boolean;
}

export function resolveDateRange(
  preset: AnalyticsRangePreset,
  customFrom?: string | null,
  customTo?: string | null,
): ResolvedRange {
  const now = new Date();

  function withComparison(start: Date, end: Date): ResolvedRange {
    const durationMs = end.getTime() - start.getTime();
    return {
      start,
      end,
      prevStart: new Date(start.getTime() - durationMs),
      prevEnd: new Date(start.getTime()),
      hasComparison: true,
    };
  }

  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return withComparison(start, now);
  }

  if (preset === "7d" || preset === "30d" || preset === "90d") {
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return withComparison(start, now);
  }

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return withComparison(start, now);
  }

  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    end.setMilliseconds(-1); // last instant of the previous month
    return withComparison(start, end);
  }

  if (preset === "custom" && customFrom && customTo) {
    const start = new Date(customFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);
    return withComparison(start, end);
  }

  // 'all' (or a malformed custom range) - no meaningful "previous period".
  return { start: null, end: now, prevStart: null, prevEnd: null, hasComparison: false };
}

export interface MetricWithGrowth {
  value: number;
  previousValue: number;
  /** Percent change vs the previous period. Null when there's no previous-period baseline to compare against (e.g. previous was zero, or range is 'all'). */
  growthPercent: number | null;
}

function metricWithGrowth(current: number, previous: number, hasComparison: boolean): MetricWithGrowth {
  if (!hasComparison) {
    return { value: current, previousValue: 0, growthPercent: null };
  }
  if (previous === 0) {
    return { value: current, previousValue: 0, growthPercent: current > 0 ? null : 0 };
  }
  return { value: current, previousValue: previous, growthPercent: ((current - previous) / previous) * 100 };
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
  visits: number;
  newVendors: number;
  newCustomers: number;
}

export interface TrafficSourceRow {
  source: string;
  count: number;
  percentage: number;
}

export interface VendorEarningsRow {
  storeId: string;
  storeName: string;
  vendorId: string;
  periodRevenue: number;
  previousPeriodRevenue: number;
  growthPercent: number | null;
  periodOrders: number;
  allTimeRevenue: number;
}

export interface PlatformAnalytics {
  range: { start: string | null; end: string; hasComparison: boolean };
  totals: {
    revenue: MetricWithGrowth;
    orders: MetricWithGrowth;
    visits: MetricWithGrowth;
    newVendors: MetricWithGrowth;
    newCustomers: MetricWithGrowth;
    conversionRate: number | null; // orders / visits * 100, for the current period
  };
  dailyTrend: DailyTrendPoint[];
  trafficSources: TrafficSourceRow[];
  topVendors: VendorEarningsRow[];
}

// Capped rather than truly unbounded - fine for an early-stage platform.
// Revisit with DB-side aggregation (a view or RPC) if these tables grow
// past tens of thousands of rows in the queried window.
const ROW_CAP = 20000;

export async function getPlatformAnalytics(range: ResolvedRange): Promise<PlatformAnalytics> {
  const supabase = createAdminSupabaseClient();
  const queryFloor = range.prevStart ?? range.start; // fetch previous+current in one pass

  const [ordersRes, visitsRes, usersRes, storesRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("orders")
        .select("id, store_id, status, total_amount, created_at")
        .lte("created_at", range.end.toISOString())
        .order("created_at", { ascending: false })
        .limit(ROW_CAP);
      if (queryFloor) q = q.gte("created_at", queryFloor.toISOString());
      return q;
    })(),
    (() => {
      let q = supabase
        .from("store_visits")
        .select("id, source, created_at")
        .lte("created_at", range.end.toISOString())
        .order("created_at", { ascending: false })
        .limit(ROW_CAP);
      if (queryFloor) q = q.gte("created_at", queryFloor.toISOString());
      return q;
    })(),
    (() => {
      let q = supabase
        .from("users")
        .select("id, role, created_at")
        .lte("created_at", range.end.toISOString())
        .limit(ROW_CAP);
      if (queryFloor) q = q.gte("created_at", queryFloor.toISOString());
      return q;
    })(),
    supabase.from("stores").select("id, vendor_id, name"),
  ]);

  const orders = ordersRes.data ?? [];
  const visits = visitsRes.data ?? [];
  const users = usersRes.data ?? [];
  const storeById = new Map((storesRes.data ?? []).map((s) => [s.id, s]));

  const inCurrentPeriod = (iso: string) => (!range.start || new Date(iso) >= range.start) && new Date(iso) <= range.end;
  const inPreviousPeriod = (iso: string) =>
    range.hasComparison && range.prevStart && range.prevEnd
      ? new Date(iso) >= range.prevStart && new Date(iso) < range.prevEnd
      : false;

  // ---- Revenue & orders ----
  let currentRevenue = 0;
  let previousRevenue = 0;
  let currentOrders = 0;
  let previousOrders = 0;

  const dailyMap = new Map<string, DailyTrendPoint>();
  if (range.start) {
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(range.end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, revenue: 0, orders: 0, visits: 0, newVendors: 0, newCustomers: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  type VendorAccumulator = { periodRevenue: number; previousPeriodRevenue: number; periodOrders: number; allTimeRevenue: number };
  const vendorEarnings = new Map<string, VendorAccumulator>();

  for (const order of orders) {
    if (!REVENUE_STATUSES.has(order.status)) continue;
    const amount = Number(order.total_amount ?? 0);
    const isCurrent = inCurrentPeriod(order.created_at);
    const isPrevious = inPreviousPeriod(order.created_at);

    const vendorRow = vendorEarnings.get(order.store_id) ?? {
      periodRevenue: 0,
      previousPeriodRevenue: 0,
      periodOrders: 0,
      allTimeRevenue: 0,
    };

    if (isCurrent) {
      currentRevenue += amount;
      currentOrders += 1;
      vendorRow.periodRevenue += amount;
      vendorRow.periodOrders += 1;

      const dayKey = order.created_at.slice(0, 10);
      const bucket = dailyMap.get(dayKey);
      if (bucket) {
        bucket.revenue += amount;
        bucket.orders += 1;
      }
    } else if (isPrevious) {
      previousRevenue += amount;
      previousOrders += 1;
      vendorRow.previousPeriodRevenue += amount;
    }

    // All-time revenue tracks every fetched row regardless of period -
    // note this is bounded by ROW_CAP / the query floor above, so on a
    // very long 'all' range with more than ROW_CAP orders this undercounts.
    // Fine for now; revisit if/when order volume gets there.
    vendorRow.allTimeRevenue += amount;
    vendorEarnings.set(order.store_id, vendorRow);
  }

  // ---- Visits ----
  let currentVisits = 0;
  let previousVisits = 0;
  const sourceCounts = new Map<string, number>();

  for (const visit of visits) {
    if (inCurrentPeriod(visit.created_at)) {
      currentVisits += 1;
      sourceCounts.set(visit.source, (sourceCounts.get(visit.source) ?? 0) + 1);
      const dayKey = visit.created_at.slice(0, 10);
      const bucket = dailyMap.get(dayKey);
      if (bucket) bucket.visits += 1;
    } else if (inPreviousPeriod(visit.created_at)) {
      previousVisits += 1;
    }
  }

  const trafficSources: TrafficSourceRow[] = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count, percentage: currentVisits > 0 ? (count / currentVisits) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  // ---- New vendors / customers ----
  let currentNewVendors = 0;
  let previousNewVendors = 0;
  let currentNewCustomers = 0;
  let previousNewCustomers = 0;

  for (const user of users) {
    const isCurrent = inCurrentPeriod(user.created_at);
    const isPrevious = inPreviousPeriod(user.created_at);
    if (user.role === "vendor") {
      if (isCurrent) {
        currentNewVendors += 1;
        const bucket = dailyMap.get(user.created_at.slice(0, 10));
        if (bucket) bucket.newVendors += 1;
      } else if (isPrevious) previousNewVendors += 1;
    } else if (user.role === "customer") {
      if (isCurrent) {
        currentNewCustomers += 1;
        const bucket = dailyMap.get(user.created_at.slice(0, 10));
        if (bucket) bucket.newCustomers += 1;
      } else if (isPrevious) previousNewCustomers += 1;
    }
  }

  const topVendors: VendorEarningsRow[] = [...vendorEarnings.entries()]
    .map(([storeId, earnings]) => {
      const store = storeById.get(storeId);
      const growthPercent =
        earnings.previousPeriodRevenue === 0
          ? earnings.periodRevenue > 0
            ? null
            : 0
          : ((earnings.periodRevenue - earnings.previousPeriodRevenue) / earnings.previousPeriodRevenue) * 100;
      return {
        storeId,
        storeName: store?.name ?? "Unknown store",
        vendorId: store?.vendor_id ?? "",
        periodRevenue: earnings.periodRevenue,
        previousPeriodRevenue: earnings.previousPeriodRevenue,
        growthPercent,
        periodOrders: earnings.periodOrders,
        allTimeRevenue: earnings.allTimeRevenue,
      };
    })
    .sort((a, b) => b.periodRevenue - a.periodRevenue)
    .slice(0, 20);

  return {
    range: {
      start: range.start ? range.start.toISOString() : null,
      end: range.end.toISOString(),
      hasComparison: range.hasComparison,
    },
    totals: {
      revenue: metricWithGrowth(currentRevenue, previousRevenue, range.hasComparison),
      orders: metricWithGrowth(currentOrders, previousOrders, range.hasComparison),
      visits: metricWithGrowth(currentVisits, previousVisits, range.hasComparison),
      newVendors: metricWithGrowth(currentNewVendors, previousNewVendors, range.hasComparison),
      newCustomers: metricWithGrowth(currentNewCustomers, previousNewCustomers, range.hasComparison),
      conversionRate: currentVisits > 0 ? (currentOrders / currentVisits) * 100 : null,
    },
    dailyTrend: [...dailyMap.values()],
    trafficSources,
    topVendors,
  };
}