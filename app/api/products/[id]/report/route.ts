import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";

const reportSchema = z.object({
  reason: z.enum(["counterfeit", "misleading", "inappropriate", "other"]),
  details: z.string().max(2000).optional(),
  email: z.string().email().optional(),
});

// Deliberately public - no requireAdminApi/session requirement, since any
// visitor (logged in or not) should be able to flag a listing. If a
// session exists, it's attached for context; it's never required.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a reason for the report." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: product } = await supabase.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);

  const { error } = await supabase.from("product_reports").insert({
    product_id: productId,
    reporter_user_id: session?.user?.id || null,
    reporter_email: parsed.data.email || session?.user?.email || null,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) {
    logDevError("products.report", error, { productId });
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}