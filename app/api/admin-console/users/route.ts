import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "all"; // 'vendor' | 'customer' | 'all'
  const status = searchParams.get("status") ?? "all"; // 'active' | 'suspended' | 'all'
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("users")
    .select("id, email, full_name, role, status, created_at", { count: "exact" })
    .in("role", role === "all" ? ["vendor", "customer"] : [role])
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data: users, error, count } = await query;

  if (error) {
    logDevError("admin-console.users.list", error, { role, status, q, page });
    return NextResponse.json({ error: "Could not load users." }, { status: 500 });
  }

  const vendorIds = (users ?? []).filter((u) => u.role === "vendor").map((u) => u.id);
  let storesByVendor = new Map<string, { name: string; is_active: boolean }>();

  if (vendorIds.length > 0) {
    const { data: stores } = await supabase
      .from("stores")
      .select("vendor_id, name, is_active")
      .in("vendor_id", vendorIds);
    storesByVendor = new Map((stores ?? []).map((s) => [s.vendor_id, { name: s.name, is_active: s.is_active }]));
  }

  const rows = (users ?? []).map((user) => ({
    ...user,
    store: storesByVendor.get(user.id) ?? null,
  }));

  return NextResponse.json({ users: rows, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
