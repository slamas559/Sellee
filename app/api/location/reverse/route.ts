import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

type NominatimResponse = {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
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

function composeStreet(address: NominatimResponse["address"]): string | null {
  if (!address) return null;
  const house = clean(address.house_number);
  const road = clean(address.road);
  const suburb = clean(address.suburb) ?? clean(address.neighbourhood);
  if (house && road) return `${house} ${road}`;
  if (road) return road;
  if (suburb) return suburb;
  return null;
}

function cityFrom(address: NominatimResponse["address"]): string | null {
  if (!address) return null;
  return (
    clean(address.city) ??
    clean(address.town) ??
    clean(address.village) ??
    clean(address.county)
  );
}

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reverse geocode coordinates." }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Sellee/1.0 reverse-geocode",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not reverse geocode location." }, { status: 502 });
    }

    const payload = (await response.json()) as NominatimResponse;
    const address = payload.address ?? {};

    return NextResponse.json({
      location: {
        display_name: clean(payload.display_name),
        street: composeStreet(address),
        city: cityFrom(address),
        state: clean(address.state),
        country: clean(address.country),
      },
    });
  } catch {
    return NextResponse.json({ error: "Network error during reverse geocode." }, { status: 502 });
  }
}

