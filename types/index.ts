export type UserRole = "vendor" | "customer";
export type StoreTemplate =
  | "grocery_promo"
  | "fashion_editorial"
  | "lifestyle_showcase"
  | "modern_grid"
  | "classic"
  | "bold"
  | "minimal";

export type StoreThemePreset =
  | "emerald_fresh"
  | "sunlit_market"
  | "midnight_luxe"
  | "ocean_breeze"
  | "rose_boutique";

export type StorefrontConfig = {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_image_url: string;
  promo_text: string;
  secondary_banner_url: string;
};

export type StoreRecord = {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp_number: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: "manual" | "gps" | null;
  store_template: StoreTemplate;
  store_theme_preset: StoreThemePreset;
  storefront_config: StorefrontConfig | null;
  rating_avg: number | null;
  rating_count: number;
  theme_color: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProductRecord = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  rating_avg: number | null;
  rating_count: number;
  stock_count: number;
  is_available: boolean;
  created_at: string;
};

export type OrderRecord = {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_whatsapp: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  created_at: string;
};

export type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};
