import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) return NextResponse.json([]);

  try {
    const supabase = createAdminSupabaseClient();
    // Search product names, categories and store names for suggestions
    const ilike = `%${q}%`;

    const [{ data: names }, { data: categories }, { data: stores }] = await Promise.all([
      supabase
        .from("products")
        .select("name")
        .ilike("name", ilike)
        .limit(6),
      supabase
        .from("products")
        .select("category")
        .ilike("category", ilike)
        .limit(4),
      supabase
        .from("stores")
        .select("name")
        .ilike("name", ilike)
        .limit(4),
    ]);

    const suggestions = new Set<string>();
    (names ?? []).forEach((r: any) => r.name && suggestions.add(r.name));
    (categories ?? []).forEach((r: any) => r.category && suggestions.add(r.category));
    (stores ?? []).forEach((r: any) => r.name && suggestions.add(r.name));

    const out = Array.from(suggestions).slice(0, 8);
    if (out.length > 0) return NextResponse.json(out);

    return NextResponse.json([q, `${q} near me`, `${q} sale`]);
  } catch (e) {
    // Fallback to simple suggestions on error
    return NextResponse.json([q, `${q} near me`, `${q} sale`]);
  }
}
