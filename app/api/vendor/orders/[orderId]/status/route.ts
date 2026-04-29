import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireVerifiedPhone } from "@/lib/require-verified-phone";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import { waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";

const statusSchema = z.object({
  status: z.enum(["confirmed", "rejected"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const guard = await requireVerifiedPhone({
    userId: session.user.id,
    context: "vendor_whatsapp",
    requiredRole: "vendor",
  });
  if (!guard.ok) {
    return guard.response;
  }

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { orderId } = await context.params;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id,vendor_id")
    .eq("vendor_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!store?.id) {
    return NextResponse.json({ error: "Vendor store not found." }, { status: 404 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,store_id,status,customer_whatsapp")
    .eq("id", orderId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "pending_whatsapp") {
    return NextResponse.json(
      { error: "Only pending orders can be confirmed or rejected." },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", orderId)
    .eq("store_id", store.id)
    .select("id,status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Could not update order status." }, { status: 500 });
  }

  const { data: item } = await supabase
    .from("order_items")
    .select("product:product_id(name)")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();

  const productName =
    ((item as { product?: { name?: string } | null } | null)?.product?.name ?? "").trim() ||
    "your product";
  const ref = String(orderId).slice(0, 8).toUpperCase();
  const customerPhone = String(order.customer_whatsapp ?? "").trim();
  if (customerPhone && customerPhone !== "unknown") {
    const line =
      parsed.data.status === "confirmed"
        ? `Your order #${ref} (${productName}) was confirmed.`
        : `Your order #${ref} (${productName}) was rejected.`;
    try {
      await sendWhatsAppTextMessage({
        to: customerPhone,
        message: waMessage(waTitle("Order Update"), line),
      });
    } catch {
      // non-blocking customer notification
    }
  }

  return NextResponse.json({ success: true, order: updated });
}
