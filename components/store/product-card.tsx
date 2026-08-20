import { ProductShowcaseCard } from "@/components/marketplace/product-showcase-card";
import type { StoreTemplate } from "@/types";
import type { ProductRecord } from "@/types";

type ProductCardProps = {
  product: ProductRecord;
  template?: StoreTemplate;
  store: {
    name: string;
    slug: string;
    logo_url: string | null;
    rating_avg: number | null;
    rating_count: number;
    is_verified?: boolean | null;
  };
  currentSubdomainSlug?: string | null;
};

export function ProductCard({ product, store, template = "classic", currentSubdomainSlug }: ProductCardProps) {
  return (
    <ProductShowcaseCard
      product={product}
      store={store}
      variant="home"
      template={template}
      source="store"
      currentSubdomainSlug={currentSubdomainSlug}
    />
  );
}