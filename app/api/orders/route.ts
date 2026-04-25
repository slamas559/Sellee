import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const createOrderSchema = z.object({
  store_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  customer_name: z.string().min(1).max(80).optional(),
  customer_whatsapp: z.string().min(5).max(30).optional(),
});

function deriveCustomerName(email: string): string {
  const local = (email.split("@")[0] ?? "customer").replace(/[._-]+/g, " ").trim();
  if (!local) return "Customer";
  return local
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please login to place an order." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, phone")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError || !user) {
      logDevError("orders.user-lookup", userError, { userId: session.user.id });
      return NextResponse.json({ error: "Could not verify your account." }, { status: 500 });
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, is_active")
      .eq("id", parsed.data.store_id)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError || !store) {
      logDevError("orders.store-lookup", storeError, { storeId: parsed.data.store_id });
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, stock_count, is_available")
      .eq("id", parsed.data.product_id)
      .eq("store_id", parsed.data.store_id)
      .eq("is_available", true)
      .maybeSingle();

    if (productError || !product) {
      logDevError("orders.product-lookup", productError, { productId: parsed.data.product_id });
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const quantity = parsed.data.quantity;
    const customerName = parsed.data.customer_name?.trim() || deriveCustomerName(String(user.email));
    const customerWhatsapp = parsed.data.customer_whatsapp?.trim() || String(user.phone ?? "");

    if (!customerWhatsapp) {
      return NextResponse.json(
        {
          error:
            "Your account is missing a WhatsApp number. Add it to continue ordering.",
        },
        { status: 400 },
      );
    }

    if (quantity > Number(product.stock_count)) {
      return NextResponse.json(
        { error: `Only ${product.stock_count} units left in stock.` },
        { status: 400 },
      );
    }

    const totalAmount = Number(product.price) * quantity;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: parsed.data.store_id,
        customer_name: customerName,
        customer_whatsapp: customerWhatsapp,
        status: "pending_whatsapp",
        total_amount: totalAmount,
        payment_method: null,
      })
      .select("id, status, total_amount, created_at")
      .single();

    if (orderError || !order) {
      logDevError("orders.create", orderError, {
        storeId: parsed.data.store_id,
        productId: parsed.data.product_id,
      });
      return NextResponse.json({ error: "Could not create order." }, { status: 500 });
    }

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: parsed.data.product_id,
      quantity,
      unit_price: Number(product.price),
    });

    if (itemError) {
      logDevError("orders.create-item", itemError, { orderId: order.id });

      await supabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json({ error: "Could not create order item." }, { status: 500 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
      },
      store: {
        id: store.id,
        name: store.name,
      },
      product: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
      },
      quantity,
    });
  } catch (error) {
    logDevError("orders.unhandled", error);
    return NextResponse.json({ error: "Unexpected order error." }, { status: 500 });
  }
}
