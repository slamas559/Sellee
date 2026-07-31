import { NextResponse } from "next/server";
import { z } from "zod";
import { getShoppingAssistantReply } from "@/lib/ai/product-assistant";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return realIp ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    // Generous but real cap: this proxies to a free-tier LLM provider with
    // its own rate limits, so we don't want one visitor exhausting the
    // shared quota for everyone else browsing the marketplace.
    const limit = checkRateLimit(`ai-product-chat:${ip}`, 20, 10 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You're chatting a little fast - please wait a bit and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const parsed = chatRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
    }

    const result = await getShoppingAssistantReply(parsed.data.messages);
    return NextResponse.json(result);
  } catch (error) {
    logDevError("ai.product_chat.unhandled", error);
    return NextResponse.json(
      { error: "The shopping assistant hit a snag. Please try again." },
      { status: 500 },
    );
  }
}