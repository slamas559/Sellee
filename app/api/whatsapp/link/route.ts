import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { generateLinkCodeForVendor } from "@/lib/whatsapp-bot/vendor-commands";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    const { data: link, error: linkError } = await supabase
      .from("whatsapp_vendor_links")
      .select("vendor_id, whatsapp_number, linked_at, is_active")
      .eq("vendor_id", session.user.id)
      .maybeSingle();

    if (linkError) {
      logDevError("whatsapp.link.status.link", linkError, { userId: session.user.id });
      return NextResponse.json({ error: "Could not load WhatsApp link status." }, { status: 500 });
    }

    const { data: pendingCode, error: codeError } = await supabase
      .from("whatsapp_link_codes")
      .select("code, expires_at, used_at")
      .eq("vendor_id", session.user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      logDevError("whatsapp.link.status.code", codeError, { userId: session.user.id });
      return NextResponse.json({ error: "Could not load WhatsApp link code." }, { status: 500 });
    }

    return NextResponse.json({
      linked: link
        ? {
            whatsapp_number: link.whatsapp_number,
            linked_at: link.linked_at,
            is_active: link.is_active,
          }
        : null,
      pending_code: pendingCode
        ? {
            code: pendingCode.code,
            expires_at: pendingCode.expires_at,
          }
        : null,
    });
  } catch (error) {
    logDevError("whatsapp.link.status.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected WhatsApp link status error." }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("vendor_id", session.user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Create your store first before linking WhatsApp." },
        { status: 400 },
      );
    }

    const { code, expires_at } = await generateLinkCodeForVendor(session.user.id);

    return NextResponse.json({
      code,
      expires_at,
      instructions:
        "Send LINK <code> to your Sellee business WhatsApp number from the phone you want to link.",
    });
  } catch (error) {
    logDevError("whatsapp.link.generate.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Unexpected WhatsApp link generation error." }, { status: 500 });
  }
}

