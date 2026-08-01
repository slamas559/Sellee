import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getVendorAssistantReply } from "@/lib/ai/vendor-assistant";
import { authOptions } from "@/lib/auth";
import { getVendorStore } from "@/lib/dashboard-data";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "vendor") {
    return NextResponse.json({ error: "Vendor account required." }, { status: 403 });
  }

  // Rate limited per vendor (not per IP) since this is an authenticated
  // route - protects the shared free-tier LLM quota across all vendors.
  const limit = checkRateLimit(`ai-vendor-chat:${session.user.id}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You're chatting a little fast - please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const store = await getVendorStore(session.user.id);
    if (!store) {
      return NextResponse.json(
        { error: "Set up your store first before using the assistant." },
        { status: 400 },
      );
    }

    const parsed = chatRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
    }

    // store.id/name are resolved server-side from the session above - never
    // taken from the request body, so a vendor can never point the
    // assistant at another vendor's store.
    const result = await getVendorAssistantReply(parsed.data.messages, { id: store.id, name: store.name });
    return NextResponse.json(result);
  } catch (error) {
    logDevError("ai.vendor_chat.unhandled", error, { userId: session.user.id });
    return NextResponse.json(
      { error: "The assistant hit a snag. Please try again." },
      { status: 500 },
    );
  }
}