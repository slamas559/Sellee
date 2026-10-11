export const LIMIT_LABELS: Record<string, (value: number | null) => string> = {
  max_products: (value) =>
    value === null ? "Unlimited products" : `Up to ${value} products`,
  max_staff: (value) =>
    value === null
      ? "Unlimited staff accounts"
      : `${value} staff account${value === 1 ? "" : "s"}`,
  broadcast_per_month: (value) =>
    value === null
      ? "Unlimited WhatsApp broadcasts"
      : value === 0
        ? "No WhatsApp broadcasts"
        : `${value} WhatsApp broadcasts/month`,
};

export const FEATURE_LABELS: Record<string, string> = {
  advanced_analytics: "Advanced analytics (AOV, repeat rate, fulfillment time)",
  exportable_reports: "Exportable analytics reports",
  promo_pricing: "Promo / compare-at pricing",
  priority_search_placement: "Priority placement in marketplace search",
  featured_homepage_boost: "Featured homepage boost",
};
