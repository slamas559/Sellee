export const ANALYTICS_RANGES = ["today", "7d", "30d", "month", "year", "all", "custom"] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGES)[number];

export type Granularity = "hour" | "day" | "month";

export type AnalyticsRange = {
  key: AnalyticsRangeKey;
  label: string;
  comparisonLabel: string;
  from: Date | null;
  to: Date;
  previousFrom: Date | null;
  previousTo: Date | null;
  granularity: Granularity;
};

export const RANGE_OPTIONS: Array<{ key: AnalyticsRangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

export function parseRangeKey(value?: string | null): AnalyticsRangeKey {
  return (ANALYTICS_RANGES as readonly string[]).includes(value ?? "")
    ? (value as AnalyticsRangeKey)
    : "7d";
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysAgo(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function granularityForSpanDays(spanDays: number): Granularity {
  if (spanDays <= 1) return "hour";
  if (spanDays <= 92) return "day";
  return "month";
}

export function getAnalyticsRange(
  key: AnalyticsRangeKey,
  now: Date = new Date(),
  custom?: { from?: string | null; to?: string | null },
): AnalyticsRange {
  const to = now;

  switch (key) {
    case "today": {
      const from = startOfDay(now);
      const previousTo = new Date(from.getTime() - 1);
      const previousFrom = startOfDay(previousTo);
      return {
        key,
        label: "Today",
        comparisonLabel: "vs yesterday",
        from,
        to,
        previousFrom,
        previousTo,
        granularity: "hour",
      };
    }
    case "7d": {
      const from = startOfDay(daysAgo(now, 6));
      const previousTo = new Date(from.getTime() - 1);
      const previousFrom = startOfDay(daysAgo(previousTo, 6));
      return {
        key,
        label: "Last 7 days",
        comparisonLabel: "vs previous 7 days",
        from,
        to,
        previousFrom,
        previousTo,
        granularity: "day",
      };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousTo = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, -1);
      return {
        key,
        label: "This month",
        comparisonLabel: "vs last month",
        from,
        to,
        previousFrom,
        previousTo,
        granularity: "day",
      };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const previousFrom = new Date(now.getFullYear() - 1, 0, 1);
      const previousTo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        key,
        label: "This year",
        comparisonLabel: "vs same period last year",
        from,
        to,
        previousFrom,
        previousTo,
        granularity: "month",
      };
    }
    case "all": {
      return {
        key,
        label: "All time",
        comparisonLabel: "",
        from: null,
        to,
        previousFrom: null,
        previousTo: null,
        granularity: "month",
      };
    }
    case "custom": {
      const parsedFrom = custom?.from ? new Date(custom.from) : null;
      const parsedTo = custom?.to ? new Date(custom.to) : null;

      const validFrom = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? startOfDay(parsedFrom) : null;
      const validTo = parsedTo && !Number.isNaN(parsedTo.getTime()) ? endOfDay(parsedTo) : null;

      // Fall back to the last 7 days if the custom dates are missing/invalid,
      // and swap them if given in reverse order.
      let from = validFrom ?? startOfDay(daysAgo(now, 6));
      let rangeTo = validTo ?? to;
      if (from > rangeTo) {
        [from, rangeTo] = [startOfDay(rangeTo), endOfDay(from)];
      }
      // Don't let a custom "to" date reach into the future beyond now.
      if (rangeTo > to) rangeTo = to;

      const spanMs = rangeTo.getTime() - from.getTime();
      const spanDays = Math.max(1, Math.ceil(spanMs / 86_400_000));
      const previousTo = new Date(from.getTime() - 1);
      const previousFrom = new Date(previousTo.getTime() - spanMs);

      const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      return {
        key,
        label: `${fmt(from)} \u2013 ${fmt(rangeTo)}`,
        comparisonLabel: `vs previous ${spanDays} day${spanDays === 1 ? "" : "s"}`,
        from,
        to: rangeTo,
        previousFrom,
        previousTo,
        granularity: granularityForSpanDays(spanDays),
      };
    }
    case "30d":
    default: {
      const from = startOfDay(daysAgo(now, 29));
      const previousTo = new Date(from.getTime() - 1);
      const previousFrom = startOfDay(daysAgo(previousTo, 29));
      return {
        key: "30d",
        label: "Last 30 days",
        comparisonLabel: "vs previous 30 days",
        from,
        to,
        previousFrom,
        previousTo,
        granularity: "day",
      };
    }
  }
}

export function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "hour") {
    return date.toLocaleTimeString("en-US", { hour: "numeric" });
  }
  if (granularity === "month") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Ordered list of bucket keys spanning the range, for initializing chart data with zeroes. */
export function enumerateBuckets(range: AnalyticsRange, orders?: { created_at: string }[]): string[] {
  const granularity = range.granularity;

  if (granularity === "hour") {
    // Covers "today" and any short (<=1 day) custom range.
    const keys: string[] = [];
    const start = startOfDay(range.from ?? range.to);
    const endHourExclusive =
      range.to.getFullYear() === start.getFullYear() &&
      range.to.getMonth() === start.getMonth() &&
      range.to.getDate() === start.getDate()
        ? range.to.getHours()
        : 23;
    for (let h = 0; h <= endHourExclusive; h++) {
      const d = new Date(start);
      d.setHours(h);
      keys.push(bucketKey(d, granularity));
    }
    return keys;
  }

  if (range.key === "all") {
    // Bucket by month across the actual data span (fallback to last 12 months if no orders).
    if (!orders || orders.length === 0) {
      const keys: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(range.to.getFullYear(), range.to.getMonth() - i, 1);
        keys.push(bucketKey(d, "month"));
      }
      return keys;
    }
    const earliest = orders.reduce(
      (min, o) => (new Date(o.created_at) < min ? new Date(o.created_at) : min),
      range.to,
    );
    const keys: string[] = [];
    const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
    while (cursor <= end) {
      keys.push(bucketKey(cursor, "month"));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys;
  }

  if (granularity === "month") {
    const keys: string[] = [];
    const start = range.from ?? range.to;
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
    while (cursor <= end) {
      keys.push(bucketKey(cursor, "month"));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys;
  }

  // day granularity
  const keys: string[] = [];
  const start = startOfDay(range.from ?? range.to);
  const end = startOfDay(range.to);
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(bucketKey(cursor, "day"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}