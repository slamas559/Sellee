
import { ImageResponse } from "next/og";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const runtime = "edge";
export const alt = "Store on Sellee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function StoreOGImage({ params }: Props) {
  const { slug } = await params;

  // Fetch store data
  let storeName = "Store";
  let logoUrl: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let country: string | null = null;
  let themeColor = "#059669";
  let nicheNames: string[] = [];

  try {
    const supabase = createAdminSupabaseClient();

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, logo_url, city, state, country, theme_color, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (store) {
      storeName = store.name ?? "Store";
      logoUrl = store.logo_url ?? null;
      city = store.city ?? null;
      state = store.state ?? null;
      country = store.country ?? null;
      themeColor = store.theme_color ?? "#059669";

      // Fetch niches for the store
      const { data: storeNiches } = await supabase
        .from("store_niches")
        .select("niche:niche_id(name)")
        .eq("store_id", store.id)
        .limit(3);

      nicheNames = (storeNiches ?? [])
        .map((row: any) => row.niche?.name)
        .filter(Boolean) as string[];
    }
  } catch {
    // Use fallback values if DB fails
  }

  // Build location string
  const locationParts = [city, state, country].filter(Boolean);
  const location = locationParts.slice(0, 2).join(", ");

  // First initial for fallback avatar
  const initial = storeName.charAt(0).toUpperCase();

  // Darken the theme color slightly for background gradient
  const bgEnd = themeColor;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(140deg, #0a2016 0%, ${bgEnd}cc 60%, ${bgEnd} 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `${themeColor}55`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "rgba(245,158,11,0.2)",
          }}
        />

        {/* Top: Sellee branding */}
        <div
          style={{
            position: "absolute",
            top: "36px",
            left: "56px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "9px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 900,
              color: themeColor,
            }}
          >
            S
          </div>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "18px", fontWeight: 600 }}>
            sellee.store
          </span>
        </div>

        {/* Main content — horizontally centered */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 80px",
            marginTop: "20px",
          }}
        >
          {/* Store logo or initial avatar */}
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "28px",
              background: logoUrl ? "transparent" : "white",
              border: "4px solid rgba(255,255,255,0.25)",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={storeName}
                width={120}
                height={120}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            ) : (
              <span
                style={{
                  fontSize: "56px",
                  fontWeight: 900,
                  color: themeColor,
                }}
              >
                {initial}
              </span>
            )}
          </div>

          {/* Store name */}
          <h1
            style={{
              fontSize: storeName.length > 20 ? "52px" : storeName.length > 14 ? "64px" : "76px",
              fontWeight: 900,
              color: "white",
              margin: "0 0 16px 0",
              textAlign: "center",
              lineHeight: 1.05,
              letterSpacing: "-1px",
              maxWidth: "900px",
            }}
          >
            {storeName}
          </h1>

          {/* Niche tags */}
          {nicheNames.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "16px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {nicheNames.map((niche) => (
                <span
                  key={niche}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.9)",
                    borderRadius: "100px",
                    padding: "6px 16px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  {niche}
                </span>
              ))}
            </div>
          )}

          {/* Location */}
          {location && (
            <p
              style={{
                fontSize: "20px",
                color: "rgba(255,255,255,0.65)",
                margin: 0,
                textAlign: "center",
              }}
            >
              📍 {location}
            </p>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "64px",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "17px" }}>
            Browse products
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "17px" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "17px" }}>
            Order via WhatsApp
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "17px" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "17px" }}>
            sellee.store
          </span>
        </div>
      </div>
    ),
    { ...size,
      headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, immutable, max-age=31536000",
    },
     },
  );
}