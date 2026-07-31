import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { searchStores } from "@/lib/store-search";

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().min(1).max(200).default(25),
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = nearbyQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid nearby query params." }, { status: 400 });
    }

    const { lat, lng, radius_km, q, category, limit } = parsed.data;
    const response = await searchStores({ lat, lng, radius_km, q, category, limit });

    return NextResponse.json({
      vendors: response.stores,
      meta: response.meta,
    });
  } catch (error) {
    logDevError("vendors.nearby.unhandled", error);
    return NextResponse.json({ error: "Unexpected nearby vendors error." }, { status: 500 });
  }
}