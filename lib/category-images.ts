const CATEGORY_IMAGE_SOURCES: Record<string, string> = {
  // Exact niche name matches (case-insensitive key lookup below)
  "groceries":           "https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=80&h=80&q=70",
  "fashion":             "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=80&h=80&q=70",
  "electronics":         "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=80&h=80&q=70",
  "beauty":              "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=80&h=80&q=70",
  "home & living":       "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  "home-living":         "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  "health & fitness":    "https://images.unsplash.com/photo-1554284126-aa88f22d8a90?auto=format&fit=crop&w=80&h=80&q=70",
  "health-fitness":      "https://images.unsplash.com/photo-1554284126-aa88f22d8a90?auto=format&fit=crop&w=80&h=80&q=70",
  "baby & kids":         "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=80&h=80&q=70",
  "baby-kids":           "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=80&h=80&q=70",
  "furnitures":          "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=80&h=80&q=70",
  "automotive":          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=80&h=80&q=70",
  "food & drinks":       "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=80&h=80&q=70",
  "food-drinks":         "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=80&h=80&q=70",
  "books & stationery":  "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=80&h=80&q=70",
  "books-stationery":    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=80&h=80&q=70",
  "gadgets & electronics":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "gadgets-electronics":  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "sports":              "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=80&h=80&q=70",
  "art & crafts":        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=80&h=80&q=70",
  "art-crafts":          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=80&h=80&q=70",
  "digital products":    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=80&h=80&q=70",
  "digital-products":    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=80&h=80&q=70",
  "thrift & vintage":    "https://images.unsplash.com/photo-1520975918642-1d0b45d9c6f9?auto=format&fit=crop&w=80&h=80&q=70",
  "thrift-vintage":      "https://images.unsplash.com/photo-1520975918642-1d0b45d9c6f9?auto=format&fit=crop&w=80&h=80&q=70",
  "jewelry":             "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=80&h=80&q=70",
  "pets":                "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=80&h=80&q=70",
  "phones & accessories":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "phones-accessories":  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=80&h=80&q=70",
  "services":            "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=80&h=80&q=70",
  "event & party":       "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=80&h=80&q=70",
  "event-party":         "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=80&h=80&q=70",
  "gaming":              "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=80&h=80&q=70",
};

const CATEGORY_IMAGE_DEFAULT =
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=80&h=80&q=70";

export function categoryImageUrl(category: string): string {
  return (
    CATEGORY_IMAGE_SOURCES[category.toLowerCase().trim()] ?? CATEGORY_IMAGE_DEFAULT
  );
}