import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET() {
  const startedAt = Date.now();
  const hasWhatsAppToken = Boolean(process.env.WHATSAPP_TOKEN);
  const hasWhatsAppPhoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const hasWhatsAppVerifyToken = Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  const hasWhatsAppApiVersion = Boolean(process.env.WHATSAPP_API_VERSION);
  const whatsappConfigOk =
    hasWhatsAppToken &&
    hasWhatsAppPhoneNumberId &&
    hasWhatsAppVerifyToken &&
    hasWhatsAppApiVersion;

  try {
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from("users").select("id").limit(1);

    if (error || !whatsappConfigOk) {
      return NextResponse.json(
        {
          ok: false,
          service: "sellee-api",
          timestamp: new Date().toISOString(),
          db: error
            ? {
                ok: false,
                message: error.message,
                code: error.code,
              }
            : { ok: true },
          whatsapp: {
            ok: whatsappConfigOk,
            missing: {
              WHATSAPP_TOKEN: !hasWhatsAppToken,
              WHATSAPP_PHONE_NUMBER_ID: !hasWhatsAppPhoneNumberId,
              WHATSAPP_WEBHOOK_VERIFY_TOKEN: !hasWhatsAppVerifyToken,
              WHATSAPP_API_VERSION: !hasWhatsAppApiVersion,
            },
          },
          durationMs: Date.now() - startedAt,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      service: "sellee-api",
      timestamp: new Date().toISOString(),
      db: { ok: true },
      whatsapp: {
        ok: true,
      },
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "sellee-api",
        timestamp: new Date().toISOString(),
        db: { ok: false },
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : "Health check failed",
        whatsapp: {
          ok: whatsappConfigOk,
          missing: {
            WHATSAPP_TOKEN: !hasWhatsAppToken,
            WHATSAPP_PHONE_NUMBER_ID: !hasWhatsAppPhoneNumberId,
            WHATSAPP_WEBHOOK_VERIFY_TOKEN: !hasWhatsAppVerifyToken,
            WHATSAPP_API_VERSION: !hasWhatsAppApiVersion,
          },
        },
        durationMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}

