
import { ImageResponse } from "next/og";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { parseProductPathSegment } from "@/lib/format";

export const runtime = "edge";
export const alt = "Product on Sellee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

type Props = {
  params: Promise<{ slug: string; productSlug: string }>;
};

function formatNairaSimple(value: number): string {
  return (
    "NGN " +
    new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 0,
    }).format(value)
  );
}
export default async function ProductOGImage({ params }: Props) {
  const { slug, productSlug } = await params;

  let productName = "Product";
  let productPrice: number | null = null;
  let productImage: string | null = null;
  let productCategory: string | null = null;
  let storeName = "Store";
  let storeLogo: string | null = null;
  let themeColor = "#059669";
  let inStock = true;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, logo_url, theme_color, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (store) {
      storeName = store.name ?? "Store";
      storeLogo = store.logo_url ?? null;
      themeColor = store.theme_color ?? "#059669";

      const parsedPath = parseProductPathSegment(productSlug);

      let productQuery = supabase
        .from("products")
        .select("id, name, price, image_url, category, stock_count, is_available")
        .eq("store_id", store.id);

      if (parsedPath.id) {
        productQuery = productQuery.eq("id", parsedPath.id);
      } else if (parsedPath.isUuidOnly) {
        productQuery = productQuery.eq("id", productSlug);
      } else {
        productQuery = productQuery.eq("slug", productSlug);
      }

      const { data: product } = await productQuery.maybeSingle();

      if (product) {
        productName = product.name ?? "Product";
        productPrice = product.price ? Number(product.price) : null;
        productImage = product.image_url ?? null;
        productCategory = product.category ?? null;
        inStock = Boolean(product.is_available) && Number(product.stock_count ?? 0) > 0;
      }
    }
  } catch {
    // Use fallback values
  }

  const storeInitial = storeName.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#0f1a14",
        }}
      >
        {/* Left: Product image (takes 55% width) */}
        <div
          style={{
            width: "660px",
            height: "630px",
            position: "relative",
            flexShrink: 0,
            display: "flex",
          }}
        >
          {productImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage}
                alt={productName}
                width={660}
                height={630}
                style={{
                  objectFit: "cover",
                  width: "660px",
                  height: "630px",
                }}
              />
              {/* Gradient overlay on image */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to right, rgba(15,26,20,0) 60%, rgba(15,26,20,0.95) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, rgba(15,26,20,0) 50%, rgba(15,26,20,0.6) 100%)",
                }}
              />
            </>
          ) : (
            // Fallback when no product image
            <div
              style={{
                width: "660px",
                height: "630px",
                background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}88)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "120px", opacity: 0.3 }}>🛍️</span>
            </div>
          )}
        </div>

        {/* Right: Product info panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "48px 52px 40px 48px",
            background: "linear-gradient(160deg, #0f1a14 0%, #0d2218 60%, #0a1c14 100%)",
            justifyContent: "space-between",
          }}
        >
          {/* Top: Store info */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: storeLogo ? "transparent" : "white",
                border: `2px solid ${themeColor}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {storeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storeLogo}
                  alt={storeName}
                  width={44}
                  height={44}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              ) : (
                <span style={{ fontSize: "22px", fontWeight: 900, color: themeColor }}>
                  {storeInitial}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 500,
                  marginBottom: "2px",
                }}
              >
                Sold by
              </span>
              <span style={{ fontSize: "17px", color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                {storeName}
              </span>
            </div>
          </div>

          {/* Middle: Product details */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: "16px" }}>
            {/* Category badge */}
            {productCategory && (
              <div
                style={{
                  display: "flex",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    background: `${themeColor}33`,
                    color: themeColor,
                    borderRadius: "100px",
                    padding: "5px 14px",
                    fontSize: "14px",
                    fontWeight: 700,
                    border: `1px solid ${themeColor}55`,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                  }}
                >
                  {productCategory}
                </span>
              </div>
            )}

            {/* Product name */}
            <h1
              style={{
                fontSize:
                  productName.length > 30
                    ? "32px"
                    : productName.length > 20
                    ? "38px"
                    : "44px",
                fontWeight: 900,
                color: "white",
                margin: "0 0 20px 0",
                lineHeight: 1.15,
                letterSpacing: "-0.5px",
              }}
            >
              {productName}
            </h1>

            {/* Price */}
            {productPrice !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span
                  style={{
                    fontSize: "42px",
                    fontWeight: 900,
                    color: themeColor,
                    letterSpacing: "-1px",
                  }}
                >
                  {formatNairaSimple(productPrice)}
                </span>
                <span
                  style={{
                    background: inStock ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    color: inStock ? "#34d399" : "#f87171",
                    border: `1px solid ${inStock ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: "100px",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {inStock ? "In stock" : "Out of stock"}
                </span>
              </div>
            )}
          </div>

          {/* Bottom: CTA strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#25D366",
                }}
              />
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px" }}>
                Order via WhatsApp
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "5px",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 900,
                  color: themeColor,
                }}
              >
                S
              </div>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px" }}>
                sellee.store
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, immutable, max-age=31536000", // Aggressive caching helps WhatsApp
      },
     },
  );
}