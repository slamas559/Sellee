import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const PAGE_SIZE = 30;

const VALID_STATUSES = new Set([
  "pending_whatsapp",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "rejected",
]);

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  const customerQ = searchParams.get("customer")?.trim() ?? "";
  const storeQ = searchParams.get("store")?.trim() ?? "";
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const supabase = createAdminSupabaseClient();

  // !inner so a store-name filter actually constrains which orders come
  // back (a plain embed only filters the nested object, not the parent
  // rows) - safe unconditionally since every order has a non-null store_id.
  let query = supabase
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_whatsapp, status, total_amount, payment_method, created_at, store:store_id!inner(name, slug)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (status !== "all" && VALID_STATUSES.has(status)) {
    query = query.eq("status", status);
  }
  if (customerQ) {
    query = query.or(`customer_name.ilike.%${customerQ}%,customer_whatsapp.ilike.%${customerQ}%`);
  }
  if (storeQ) {
    query = query.filter("store.name", "ilike", `%${storeQ}%`);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    logDevError("admin-console.orders.list", error, { status, customerQ, storeQ, page });
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
}
