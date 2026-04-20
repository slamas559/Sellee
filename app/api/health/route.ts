import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          service: "sellee-api",
          timestamp: new Date().toISOString(),
          db: {
            ok: false,
            message: error.message,
            code: error.code,
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
        durationMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}

