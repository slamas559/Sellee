import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";
import { formatProductPathSegment } from "@/lib/format";
import { storeProductUrl } from "@/lib/store-url";
import { sendProductReportNotificationEmail } from "@/app/actions/emails";

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

  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, store:store_id(name, slug)")
    .eq("id", productId)
    .maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const store = Array.isArray(product.store) ? product.store[0] : product.store;

  const session = await getServerSession(authOptions);
  const reporterEmail = parsed.data.email || session?.user?.email || null;

  const { error } = await supabase.from("product_reports").insert({
    product_id: productId,
    reporter_user_id: session?.user?.id || null,
    reporter_email: reporterEmail,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) {
    logDevError("products.report", error, { productId });
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }

  // Best-effort notification - the report is already safely saved above,
  // so a delivery hiccup here shouldn't fail the request the customer is
  // waiting on.
  if (store) {
    const emailResult = await sendProductReportNotificationEmail({
      productId,
      productName: product.name,
      productUrl: storeProductUrl(store.slug, formatProductPathSegment(product)),
      storeName: store.name,
      reason: parsed.data.reason,
      details: parsed.data.details,
      reporterEmail,
    });
    if (!emailResult.success) {
      logDevError("products.report.notify", emailResult.error, { productId });
    }
  }

  return NextResponse.json({ ok: true });
}