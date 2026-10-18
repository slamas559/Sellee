import type { ProductRecord, StoreRecord, StorefrontConfig } from "@/types";

export type SortKey = "newest" | "price_asc" | "price_desc" | "top_rated";

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "top_rated", label: "Top rated" },
];

export function normalizeSort(value: string | undefined): SortKey {
  return SORT_OPTIONS.some((o) => o.key === value) ? (value as SortKey) : "newest";
}

export type TemplateProps = {
  store: StoreRecord;
  /** Products after search / category / sort are applied. */
  products: ProductRecord[];
  /** Products in the store before any filter is applied. */
  totalProducts: number;
  nicheNames: string[];
  completedOrdersCount: number;
  config: StorefrontConfig;
  /** Config copy with the old generic defaults removed ("" when unset). */
  copy: { title: string; subtitle: string; promo: string; cta: string };
  categories: string[];
  categoryCounts: Record<string, number>;
  selectedCategory: string;
  query: string;
  sort: SortKey;
  isFiltered: boolean;
  follow: { isLoggedIn: boolean; isOwner: boolean; isFollowing: boolean };
  storeUrl: string;
  storeHomeHref: string;
  bannerUrls: string[];
  whatsappUrl: string;
};
