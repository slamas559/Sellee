import { NextResponse } from "next/server";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

/**
 * Minimal, public store lookup by slug - just enough for the AI shopping
 * assistant to know "which store am I on" when mounted on a store page.
 * Returns nothing beyond what's already publicly visible on that same page.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Missing store slug." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: store, error } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      logDevError("stores.basic.lookup", error, { slug });
      return NextResponse.json({ error: "Could not load store." }, { status: 500 });
    }

    if (!store) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error) {
    logDevError("stores.basic.unhandled", error);
    return NextResponse.json({ error: "Unexpected store lookup error." }, { status: 500 });
  }
}