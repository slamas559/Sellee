// lib/whatsapp-bot/reviews.ts
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

const REVIEW_EXPIRY_HOURS = 48;

export async function promptCustomerReview(params: {
  orderId: string;
  storeId: string;
  storeName: string;
  customerPhone: string;
}) {
  const supabase = createAdminSupabaseClient();
  const expiresAt = new Date(
    Date.now() + REVIEW_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  // Upsert so re-prompting is safe
  const { error } = await supabase.from("pending_reviews").upsert(
    {
      order_id: params.orderId,
      store_id: params.storeId,
      customer_phone: normalizeWhatsAppNumber(params.customerPhone),
      step: "rating",
      rating: null,
      prompted_at: new Date().toISOString(),
      expires_at: expiresAt,
      completed_at: null,
    },
    { onConflict: "order_id" }
  );

  if (error) throw new Error(error.message);

  await sendWhatsAppTextMessage({
    to: params.customerPhone,
    message: waMessage(
      waTitle(`How was your order from ${params.storeName}?`),
      "Reply with a number to rate your experience:",
      "1 - Very bad\n2 - Bad\n3 - Okay\n4 - Good\n5 - Excellent",
    ),
    command: "REVIEW_PROMPT",
    role: "customer",
    scopeStoreId: params.storeId,
  });
}

export async function getPendingReview(customerPhone: string) {
  const supabase = createAdminSupabaseClient();
  const normalized = normalizeWhatsAppNumber(customerPhone);

  const { data, error } = await supabase
    .from("pending_reviews")
    .select("id, order_id, store_id, step, rating, expires_at")
    .eq("customer_phone", normalized)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("prompted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

type PendingReview = NonNullable<Awaited<ReturnType<typeof getPendingReview>>>;

const RATING_MAP: Record<string, number> = {
  "1": 1, "very bad": 1, "terrible": 1, "awful": 1,
  "2": 2, "bad": 2, "poor": 2,
  "3": 3, "okay": 3, "ok": 3, "fine": 3, "average": 3,
  "4": 4, "good": 4, "great": 4, "nice": 4,
  "5": 5, "excellent": 5, "perfect": 5, "amazing": 5, "outstanding": 5,
};

export async function handleReviewReply(
  from: string,
  body: string,
  pendingReview: PendingReview
): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const normalized = normalizeWhatsAppNumber(from);
  const text = body.trim().toLowerCase();

  // ── Step 1: Rating ────────────────────────────────────────
  if (pendingReview.step === "rating") {
    const rating = RATING_MAP[text];

    if (!rating) {
      await sendWhatsAppTextMessage({
        to: from,
        message: waMessage(
          waTitle("Please rate 1 to 5"),
          "Reply with just a number:\n1 - Very bad\n2 - Bad\n3 - Okay\n4 - Good\n5 - Excellent",
        ),
        command: "REVIEW_PROMPT",
        role: "customer",
        scopeStoreId: pendingReview.store_id,
      });
      return true; // still handling this conversation
    }

    // Save rating, advance to comment step
    const { error } = await supabase
      .from("pending_reviews")
      .update({ rating, step: "comment" })
      .eq("id", pendingReview.id);

    if (error) throw new Error(error.message);

    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle(`Thanks for the ${rating}/5 rating!`),
        "Would you like to add a comment? Reply with your feedback, or send *SKIP* to finish.",
      ),
      command: "REVIEW_PROMPT",
      role: "customer",
      scopeStoreId: pendingReview.store_id,
    });

    return true;
  }

  // ── Step 2: Comment (optional) ────────────────────────────
  if (pendingReview.step === "comment") {
    const comment = text === "skip" || text === "no" ? null : body.trim();
    const rating = pendingReview.rating ?? 5;

    // Save to vendor_reviews using your existing table
    await supabase.from("vendor_reviews").insert({
      store_id: pendingReview.store_id,
      reviewer_name: "WhatsApp Customer",
      rating,
      comment: comment ?? null,
    });

    // Refresh store rating_avg and rating_count
    const { data: allRatings } = await supabase
      .from("vendor_reviews")
      .select("rating")
      .eq("store_id", pendingReview.store_id);

    const count = allRatings?.length ?? 0;
    const avg = count > 0
      ? Number(
          (allRatings!.reduce((s, r) => s + Number(r.rating), 0) / count).toFixed(2)
        )
      : 0;

    await supabase
      .from("stores")
      .update({ rating_avg: avg, rating_count: count })
      .eq("id", pendingReview.store_id);

    // Mark pending review as done
    await supabase
      .from("pending_reviews")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", pendingReview.id);

    await sendWhatsAppTextMessage({
      to: from,
      message: waMessage(
        waTitle("Review Saved!"),
        `Your ${rating}/5 rating has been recorded.`,
        comment ? "Your comment has been shared with the vendor." : "",
        "Thank you for shopping on Sellee.",
      ),
      command: "REVIEW_COMPLETE",
      role: "customer",
      scopeStoreId: pendingReview.store_id,
    });

    return true;
  }

  return false;
}