import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "0", 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 0;
  const requestedStatus = searchParams.get("status") ?? "all";
  const status = ["active", "inactive", "all"].includes(requestedStatus) ? requestedStatus : "all";
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("stores")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("is_active", status === "active");
  }
  if (q) {
    const safeQuery = q.replace(/[,%()\\]/g, " ").trim();
    if (safeQuery) {
      query = query.or(
        `name.ilike.%${safeQuery}%,slug.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%,state.ilike.%${safeQuery}%`,
      );
    }
  }

  const { data: stores, error, count } = await query.range(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE - 1,
  );

  if (error) {
    logDevError("admin-console.stores.list", error, { page, status });
    return NextResponse.json({ error: "Could not load vendor stores." }, { status: 500 });
  }

  const vendorIds = [...new Set((stores ?? []).map((store) => store.vendor_id))];
  const { data: vendors, error: vendorsError } = vendorIds.length
    ? await supabase
        .from("users")
        .select("id, full_name, email, phone, role, status, created_at, email_verified_at")
        .in("id", vendorIds)
    : { data: [], error: null };

  if (vendorsError) {
    logDevError("admin-console.stores.vendors", vendorsError, { page, vendorCount: vendorIds.length });
    return NextResponse.json({ error: "Could not load store owners." }, { status: 500 });
  }

  const vendorsById = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor]));
  const items = (stores ?? []).map((store) => ({
    store,
    vendor: vendorsById.get(store.vendor_id) ?? null,
  }));

  return NextResponse.json({ items, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
