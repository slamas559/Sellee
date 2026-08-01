import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { refineText } from "@/lib/ai/refine";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const refineRequestSchema = z.object({
  text: z.string().trim().min(1).max(1500),
  kind: z.enum(["product_description", "store_hero_subtitle", "broadcast_message"]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "vendor") {
    return NextResponse.json({ error: "Vendor account required." }, { status: 403 });
  }

  const limit = checkRateLimit(`ai-refine:${session.user.id}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many refine requests - please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = refineRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid refine request." }, { status: 400 });
    }

    const result = await refineText(parsed.data.text, parsed.data.kind);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logDevError("ai.refine.unhandled", error, { userId: session.user.id });
    return NextResponse.json({ error: "Refinement failed. Please try again." }, { status: 500 });
  }
}