import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

type NominatimSearchResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

function clean(value?: string): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function cityFrom(address: NominatimSearchResult["address"]): string | null {
  if (!address) return null;
  return clean(address.city) ?? clean(address.town) ?? clean(address.village) ?? clean(address.county);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return realIp ?? "unknown";
}

/**
 * Forward geocoding for the map page's "search another location" box.
 * Uses the same free Nominatim (OpenStreetMap) service the existing
 * reverse-geocode route already uses - same User-Agent convention, same
 * "be a good citizen of a free public service" rate limiting on our side.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`location-search:${ip}`, 20, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many location searches - please slow down." }, { status: 429 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter at least 2 characters to search." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", parsed.data.q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Sellee/1.0 forward-geocode",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not search that location." }, { status: 502 });
    }

    const payload = (await response.json()) as NominatimSearchResult[];

    const results = payload
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return {
          display_name: clean(item.display_name) ?? "Unknown location",
          city: cityFrom(item.address),
          state: clean(item.address?.state),
          country: clean(item.address?.country),
          lat,
          lng,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Network error during location search." }, { status: 502 });
  }
}