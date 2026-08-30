import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const supabase = createAdminSupabaseClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, store_id, customer_user_id, customer_name, customer_whatsapp, status, total_amount, payment_method, created_at, store:store_id(id, name, slug, whatsapp_number)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logDevError("admin-console.orders.detail", error, { id });
    return NextResponse.json({ error: "Could not load order." }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const [{ data: items }, { data: payment }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, quantity, unit_price, product:product_id(id, name, image_url)")
      .eq("order_id", id),
    supabase
      .from("payments")
      .select("method, status, receipt_url, verified_at, created_at")
      .eq("order_id", id)
      .maybeSingle(),
  ]);

  return NextResponse.json({ order, items: items ?? [], payment: payment ?? null });
}
