import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, name, slug, is_active, created_at")
      .eq("vendor_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (storesError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not query stores",
          details:
            process.env.NODE_ENV === "development"
              ? storesError.message
              : undefined,
          code:
            process.env.NODE_ENV === "development"
              ? storesError.code
              : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      stores: stores ?? [],
      count: stores?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected debug query failure",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 },
    );
  }
}
