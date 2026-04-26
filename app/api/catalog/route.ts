import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type NicheRow = {
  id: string;
  slug: string;
  name: string;
};

type NicheCategoryRow = {
  id: string;
  niche_id: string;
  slug: string;
  name: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const supabase = createAdminSupabaseClient();

  try {
    const [{ data: nichesData, error: nichesError }, { data: categoryData, error: categoriesError }] =
      await Promise.all([
        supabase.from("niches").select("id, slug, name").order("name", { ascending: true }),
        supabase
          .from("niche_categories")
          .select("id, niche_id, slug, name")
          .order("name", { ascending: true }),
      ]);

    if (nichesError || categoriesError) {
      logDevError("catalog.get", nichesError ?? categoriesError);
      return NextResponse.json({ error: "Could not load catalog." }, { status: 500 });
    }

    const categoriesByNiche = new Map<string, Array<{ id: string; slug: string; name: string }>>();
    for (const category of (categoryData as NicheCategoryRow[] | null) ?? []) {
      const current = categoriesByNiche.get(category.niche_id) ?? [];
      current.push({ id: category.id, slug: category.slug, name: category.name });
      categoriesByNiche.set(category.niche_id, current);
    }

    const niches = ((nichesData as NicheRow[] | null) ?? []).map((niche) => ({
      id: niche.id,
      slug: niche.slug,
      name: niche.name,
      categories: categoriesByNiche.get(niche.id) ?? [],
    }));

    if (!session?.user?.id) {
      return NextResponse.json({
        niches,
        selected_niche_ids: [],
        allowed_categories: [],
      });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("vendor_id", session.user.id)
      .maybeSingle();

    if (!store?.id) {
      return NextResponse.json({
        niches,
        selected_niche_ids: [],
        allowed_categories: [],
      });
    }

    const { data: storeNichesData, error: storeNichesError } = await supabase
      .from("store_niches")
      .select("niche_id")
      .eq("store_id", store.id);

    if (storeNichesError) {
      logDevError("catalog.store-niches", storeNichesError, { storeId: store.id });
      return NextResponse.json({
        niches,
        selected_niche_ids: [],
        allowed_categories: [],
      });
    }

    const selectedNicheIds = ((storeNichesData ?? []) as Array<{ niche_id: string }>).map(
      (row) => row.niche_id,
    );

    const selectedSet = new Set(selectedNicheIds);
    const allowedCategories = niches
      .filter((niche) => selectedSet.has(niche.id))
      .flatMap((niche) => niche.categories.map((category) => category.name));

    return NextResponse.json({
      niches,
      selected_niche_ids: selectedNicheIds,
      allowed_categories: Array.from(new Set(allowedCategories)).sort((a, b) =>
        a.localeCompare(b),
      ),
    });
  } catch (error) {
    logDevError("catalog.unhandled", error);
    return NextResponse.json({ error: "Unexpected catalog error." }, { status: 500 });
  }
}
