/**
 * lib/whatsapp-bot/reviews.ts
 *
 * WhatsApp-driven review collection after order delivery.
 *
 * Flow (3 steps):
 *   Step 1 — product_rating  : "Rate the product 1–5"
 *   Step 2 — product_comment : "Add a comment? (or SKIP)"
 *   Step 3 — vendor_rating   : "Rate the delivery service 1–5"
 *   Done   — saves to product_reviews + vendor_reviews, refreshes both averages
 *
 * The pending_reviews table tracks state between messages.
 * Before inferCommand runs in router.ts, call getPendingReview(from).
 * If a pending review exists, pass the message to handleReviewReply first.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStep =
  | "product_rating"
  | "product_comment"
  | "vendor_rating";

type PendingReviewRow = {
  id: string;
  order_id: string;
  store_id: string;
  product_id: string | null;
  product_name: string | null;
  store_name: string | null;
  customer_phone: string;
  step: ReviewStep;
  product_rating: number | null;
  product_comment: string | null;
  expires_at: string;
};

// Try to resolve a display name for a reviewer using their phone number.
// Falls back to email local-part if user record has email, or a short 'Customer ####' label.
async function resolveReviewerName(supabase: ReturnType<typeof createAdminSupabaseClient>, phone: string) {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("phone", phone)
      .maybeSingle();

    if (user) {
      if (user.full_name?.trim()) return user.full_name.trim();
      if (user.email) {
        const local = (user.email.split("@")[0] ?? "customer").replace(/[._-]+/g, " ").trim();
        if (local) return local
          .split(" ")
          .filter(Boolean)
          .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
      }
    }
  } catch (e) {
    // ignore and fall back
  }
  const digits = String(phone).replace(/\D/g, "");
  const affix = digits.slice(0, 3);
  const suffix = digits.slice(-4);
  return suffix ? `${affix}***${suffix}` : "WhatsApp Customer";
}

// ─── Rating word map ──────────────────────────────────────────────────────────
// Accepts digits AND common English expressions so vendors/customers aren't locked
// into typing exactly "4" — "good", "great", "nice" all resolve to 4.

const RATING_MAP: Record<string, number> = {
  // Numeric
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
  // 1-star expressions
  "terrible": 1, "awful": 1, "horrible": 1, "very bad": 1, "worst": 1,
  // 2-star expressions
  "bad": 2, "poor": 2, "not good": 2, "disappointing": 2,
  // 3-star expressions
  "okay": 3, "ok": 3, "fine": 3, "average": 3, "fair": 3, "alright": 3, "decent": 3,
  // 4-star expressions
  "good": 4, "great": 4, "nice": 4, "satisfied": 4, "happy": 4, "liked it": 4,
  // 5-star expressions
  "excellent": 5, "perfect": 5, "amazing": 5, "outstanding": 5, "love it": 5,
  "loved it": 5, "the best": 5, "fantastic": 5, "superb": 5, "brilliant": 5,
};

function parseRating(text: string): number | null {
  const normalized = text.trim().toLowerCase();
  // Direct lookup first
  if (normalized in RATING_MAP) return RATING_MAP[normalized];
  // Single digit fallback
  const digit = parseInt(normalized, 10);
  if (!isNaN(digit) && digit >= 1 && digit <= 5) return digit;
  return null;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function refreshProductRating(productId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: ratings, error } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId);

  if (error) throw new Error(error.message);

  const count = ratings?.length ?? 0;
  const avg =
    count > 0
      ? Number(
          (
            ratings!.reduce((s, r) => s + Number(r.rating), 0) / count
          ).toFixed(2),
        )
      : 0;

  await supabase
    .from("products")
    .update({ rating_avg: avg, rating_count: count })
    .eq("id", productId);
}

async function refreshVendorRating(storeId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: ratings, error } = await supabase
    .from("vendor_reviews")
    .select("rating")
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);

  const count = ratings?.length ?? 0;
  const avg =
    count > 0
      ? Number(
          (
            ratings!.reduce((s, r) => s + Number(r.rating), 0) / count
          ).toFixed(2),
        )
      : 0;

  await supabase
    .from("stores")
    .update({ rating_avg: avg, rating_count: count })
    .eq("id", storeId);
}

/**
 * Look up the first product in the order so we know what we're reviewing.
 * Returns { product_id, product_name } or nulls if order has no items.
 */
async function getOrderProduct(
  orderId: string,
): Promise<{ product_id: string; product_name: string } | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, product:product_id(name)")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const name =
    (data as { product?: { name?: string } | null }).product?.name?.trim() ?? "";
  return { product_id: String(data.product_id), product_name: name || "Product" };
}

async function getStoreName(storeId: string): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();
  return String(data?.name ?? "the store").trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called from vendor-commands.ts handleMarkDelivered after updating order status.
 * Inserts a pending_reviews row and sends the first WhatsApp prompt to the customer.
 */
export async function promptCustomerReview(params: {
  orderId: string;
  storeId: string;
  storeName: string;
  customerPhone: string;
}) {
  const supabase = createAdminSupabaseClient();
  const normalizedPhone = normalizeWhatsAppNumber(params.customerPhone);

  // Look up the product so we can attach the review correctly
  const product = await getOrderProduct(params.orderId);

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // Upsert — safe to call again if the vendor marks delivered twice
  const { error } = await supabase.from("pending_reviews").upsert(
    {
      order_id: params.orderId,
      store_id: params.storeId,
      product_id: product?.product_id ?? null,
      product_name: product?.product_name ?? null,
      store_name: params.storeName,
      customer_phone: normalizedPhone,
      step: "product_rating" satisfies ReviewStep,
      product_rating: null,
      product_comment: null,
      prompted_at: new Date().toISOString(),
      expires_at: expiresAt,
      completed_at: null,
    },
    { onConflict: "order_id" },
  );

  if (error) throw new Error(error.message);

  const productLabel = product?.product_name ?? "your order";

  await sendWhatsAppTextMessage({
    to: params.customerPhone,
    message: waMessage(
      waTitle(`How was ${productLabel}?`),
      `From ${params.storeName}`,
      "Rate the product:",
      waList([
        "1 - Very bad",
        "2 - Bad",
        "3 - Okay",
        "4 - Good",
        "5 - Excellent",
      ]),
    ),
    command: "REVIEW_PROMPT",
    role: "customer",
    scopeStoreId: params.storeId,
  });
}

/**
 * Fetch a pending (incomplete, non-expired) review for this phone number.
 * Call this in router.ts BEFORE inferCommand so the reply is intercepted.
 */
export async function getPendingReview(
  customerPhone: string,
): Promise<PendingReviewRow | null> {
  const supabase = createAdminSupabaseClient();
  const normalized = normalizeWhatsAppNumber(customerPhone);

  const { data, error } = await supabase
    .from("pending_reviews")
    .select(
      "id, order_id, store_id, product_id, product_name, store_name, customer_phone, step, product_rating, product_comment, expires_at",
    )
    .eq("customer_phone", normalized)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("prompted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PendingReviewRow | null;
}

/**
 * Process an incoming WhatsApp message as a review reply.
 * Returns true  → message was handled (don't route to inferCommand)
 * Returns false → not a review reply (fall through to normal routing)
 */
export async function handleReviewReply(
  from: string,
  body: string,
  pendingReview: PendingReviewRow,
): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const text = body.trim();
  const textLower = text.toLowerCase();

  // ── Step 1: Product rating ─────────────────────────────────────────────────
  if (pendingReview.step === "product_rating") {
    const rating = parseRating(textLower);

    if (!rating) {
      // Unrecognised input — re-prompt, stay on this step
      await sendWhatsAppTextMessage({
        to: from,
        message: waMessage(
          waTitle("Please rate 1 to 5"),
          `How was ${pendingReview.product_name ?? "your product"}?`,
          waList([
            "1 - Very bad",
            "2 - Bad",
            "3 - Okay",
            "4 - Good",
            "5 - Excellent",
          ]),
        ),
        command: "REVIEW_PROMPT",
        role: "customer",
        scopeStoreId: pendingReview.store_id,
      });
      return true;
    }

    // Save rating and advance to comment step
    const { error } = await supabase
      .from("pending_reviews")
      .update({
        product_rating: rating,
        step: "product_comment" satisfies ReviewStep,
      })
      .eq("id", pendingReview.id);

    if (error) throw new Error(error.message);

    const emoji = ["😞", "😕", "😐", "😊", "🤩"][rating - 1];

    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle(`${emoji} ${rating}/5 — noted!`),
        "Would you like to leave a comment about the product?",
        "Reply with your feedback, or send *SKIP* to continue.",
      ),
      command: "REVIEW_PROMPT",
      role: "customer",
      scopeStoreId: pendingReview.store_id,
    });

    return true;
  }

  // ── Step 2: Product comment (optional) ────────────────────────────────────
  if (pendingReview.step === "product_comment") {
    const isSkip =
      textLower === "skip" ||
      textLower === "no" ||
      textLower === "none" ||
      textLower === "nope" ||
      textLower === "nah";

    const comment = isSkip ? null : text;

    // Persist comment and advance to vendor rating
    const { error } = await supabase
      .from("pending_reviews")
      .update({
        product_comment: comment,
        step: "vendor_rating" satisfies ReviewStep,
      })
      .eq("id", pendingReview.id);

    if (error) throw new Error(error.message);

    const storeName = pendingReview.store_name ?? "the store";

    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("One last thing!"),
        `How was the delivery and service from ${storeName}?`,
        "Rate the vendor:",
        waList([
          "1 - Very bad",
          "2 - Bad",
          "3 - Okay",
          "4 - Good",
          "5 - Excellent",
        ]),
      ),
      command: "REVIEW_PROMPT",
      role: "customer",
      scopeStoreId: pendingReview.store_id,
    });

    return true;
  }

  // ── Step 3: Vendor service rating ─────────────────────────────────────────
  if (pendingReview.step === "vendor_rating") {
    const vendorRating = parseRating(textLower);

    if (!vendorRating) {
      // Unrecognised — re-prompt
      await sendWhatsAppTextMessage({
        to: from,
        message: waMessage(
          waTitle("Please rate 1 to 5"),
          `How was the delivery service from ${pendingReview.store_name ?? "the vendor"}?`,
          waList([
            "1 - Very bad",
            "2 - Bad",
            "3 - Okay",
            "4 - Good",
            "5 - Excellent",
          ]),
        ),
        command: "REVIEW_PROMPT",
        role: "customer",
        scopeStoreId: pendingReview.store_id,
      });
      return true;
    }

    const productRating = pendingReview.product_rating ?? 5;
    const productComment = pendingReview.product_comment ?? null;

    // ── Save product review ──────────────────────────────────────────────────
    if (pendingReview.product_id) {
      const reviewerName = await resolveReviewerName(supabase, pendingReview.customer_phone);

      const { error: productReviewError } = await supabase
        .from("product_reviews")
        .insert({
          product_id: pendingReview.product_id,
          store_id: pendingReview.store_id,
          reviewer_name: reviewerName,
          rating: productRating,
          comment: productComment,
        });

      if (productReviewError) throw new Error(productReviewError.message);

      // Refresh product aggregate rating
      await refreshProductRating(pendingReview.product_id);
    }

    // ── Save vendor/store review ─────────────────────────────────────────────
    const reviewerName = await resolveReviewerName(supabase, pendingReview.customer_phone);

    const { error: vendorReviewError } = await supabase
      .from("vendor_reviews")
      .insert({
        store_id: pendingReview.store_id,
        reviewer_name: reviewerName,
        rating: vendorRating,
        comment: null, // Vendor review is service-only, no comment needed
      });

    if (vendorReviewError) throw new Error(vendorReviewError.message);

    // Refresh store aggregate rating
    await refreshVendorRating(pendingReview.store_id);

    // ── Mark pending review as completed ────────────────────────────────────
    const { error: completeError } = await supabase
      .from("pending_reviews")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", pendingReview.id);

    if (completeError) throw new Error(completeError.message);

    // ── Final thank-you message ──────────────────────────────────────────────
    const productEmoji = ["😞", "😕", "😐", "😊", "🤩"][productRating - 1];
    const vendorEmoji = ["😞", "😕", "😐", "😊", "🤩"][vendorRating - 1];
    const storeName = pendingReview.store_name ?? "the store";
    const productName = pendingReview.product_name ?? "the product";

    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Reviews saved — thank you! 🙏"),
        waList([
          `${productEmoji} ${productName}: ${productRating}/5${productComment ? ` — "${productComment}"` : ""}`,
          `${vendorEmoji} ${storeName} service: ${vendorRating}/5`,
        ]),
        "Your feedback helps other buyers and improves the vendor.",
        "Keep shopping on Sellee 🛍️",
      ),
      command: "REVIEW_COMPLETE",
      role: "customer",
      scopeStoreId: pendingReview.store_id,
    });

    return true;
  }

  // Unrecognised step — shouldn't happen, but don't block the message
  return false;
}