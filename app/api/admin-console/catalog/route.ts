import { NextResponse } from "next/server";
import { z } from "zod";
import { slugify } from "@/lib/format";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";

const createNicheSchema = z.object({
  type: z.literal("niche"),
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).optional(),
});

const createCategorySchema = z.object({
  type: z.literal("category"),
  niche_id: z.string().uuid(),
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).optional(),
});

const updateSchema = z.union([
  z.object({
    type: z.literal("niche"),
    id: z.string().uuid(),
    name: z.string().min(2).max(80),
  }),
  z.object({
    type: z.literal("category"),
    id: z.string().uuid(),
    name: z.string().min(2).max(80),
  }),
]);

const deleteSchema = z.union([
  z.object({
    type: z.literal("niche"),
    id: z.string().uuid(),
  }),
  z.object({
    type: z.literal("category"),
    id: z.string().uuid(),
  }),
]);

async function loadCatalog() {
  const supabase = createAdminSupabaseClient();
  const [{ data: niches }, { data: categories }] = await Promise.all([
    supabase.from("niches").select("id, slug, name").order("name", { ascending: true }),
    supabase
      .from("niche_categories")
      .select("id, niche_id, slug, name")
      .order("name", { ascending: true }),
  ]);

  const categoriesByNiche = new Map<
    string,
    Array<{ id: string; slug: string; name: string }>
  >();
  for (const row of (categories ?? []) as Array<{
    id: string;
    niche_id: string;
    slug: string;
    name: string;
  }>) {
    const current = categoriesByNiche.get(row.niche_id) ?? [];
    current.push({ id: row.id, slug: row.slug, name: row.name });
    categoriesByNiche.set(row.niche_id, current);
  }

  return ((niches ?? []) as Array<{ id: string; slug: string; name: string }>).map((niche) => ({
    ...niche,
    categories: categoriesByNiche.get(niche.id) ?? [],
  }));
}

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const niches = await loadCatalog();
  return NextResponse.json({ niches });
}

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsedNiche = createNicheSchema.safeParse(body);
  const parsedCategory = createCategorySchema.safeParse(body);
  const supabase = createAdminSupabaseClient();

  if (parsedNiche.success) {
    const name = parsedNiche.data.name.trim();
    const slug = slugify(parsedNiche.data.slug?.trim() || name);
    const { data, error } = await supabase.from("niches").insert({ name, slug }).select("id").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await writeAuditLog({
      adminId: session.user.id,
      action: "catalog.niche_created",
      targetType: "niche",
      targetId: data?.id,
      metadata: { name, slug },
    });
    return NextResponse.json({ ok: true, niches: await loadCatalog() });
  }

  if (parsedCategory.success) {
    const name = parsedCategory.data.name.trim();
    const slug = slugify(parsedCategory.data.slug?.trim() || name);
    const { data, error } = await supabase
      .from("niche_categories")
      .insert({ niche_id: parsedCategory.data.niche_id, name, slug })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await writeAuditLog({
      adminId: session.user.id,
      action: "catalog.category_created",
      targetType: "niche_category",
      targetId: data?.id,
      metadata: { name, slug, niche_id: parsedCategory.data.niche_id },
    });
    return NextResponse.json({ ok: true, niches: await loadCatalog() });
  }

  return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const name = parsed.data.name.trim();
  const slug = slugify(name);
  const table = parsed.data.type === "niche" ? "niches" : "niche_categories";
  const { error } = await supabase.from(table).update({ name, slug }).eq("id", parsed.data.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: parsed.data.type === "niche" ? "catalog.niche_renamed" : "catalog.category_renamed",
    targetType: parsed.data.type === "niche" ? "niche" : "niche_category",
    targetId: parsed.data.id,
    metadata: { name, slug },
  });

  return NextResponse.json({ ok: true, niches: await loadCatalog() });
}

export async function DELETE(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const table = parsed.data.type === "niche" ? "niches" : "niche_categories";
  const { error } = await supabase.from(table).delete().eq("id", parsed.data.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: parsed.data.type === "niche" ? "catalog.niche_deleted" : "catalog.category_deleted",
    targetType: parsed.data.type === "niche" ? "niche" : "niche_category",
    targetId: parsed.data.id,
  });

  return NextResponse.json({ ok: true, niches: await loadCatalog() });
}
