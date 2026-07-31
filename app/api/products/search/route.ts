import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { searchProducts } from "@/lib/product-search";

const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(50).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().min(1).max(200).default(25),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort: z.enum(["latest", "price_asc", "price_desc", "distance"]).default("latest"),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = searchQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid product search query params." }, { status: 400 });
    }

    const { q, category, lat, lng, radius_km, min_price, max_price, sort, limit } = parsed.data;

    if (
      typeof min_price === "number" &&
      typeof max_price === "number" &&
      min_price > max_price
    ) {
      return NextResponse.json({ error: "min_price cannot be greater than max_price." }, { status: 400 });
    }

    const response = await searchProducts({
      q,
      category,
      lat,
      lng,
      radius_km,
      min_price,
      max_price,
      sort,
      limit,
    });

    return NextResponse.json(response);
  } catch (error) {
    logDevError("products.search.unhandled", error);
    return NextResponse.json({ error: "Unexpected product search error." }, { status: 500 });
  }
}
