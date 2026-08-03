import { NextResponse } from "next/server";
import { logDevError, logServerInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Shared voice-input transcription endpoint, used by both the customer
 * shopping assistant (Ellie) and the vendor dashboard assistant (Vee).
 *
 * Public (no auth required) since Ellie's widget is used by anonymous
 * marketplace visitors - rate-limited by IP instead. This endpoint only
 * ever does speech-to-text; it has no access to any store/order/product
 * data, so there's nothing sensitive to gate behind auth here.
 *
 * Uses Groq's free Whisper Large v3 Turbo endpoint (OpenAI-compatible).
 * No multi-provider failover here (unlike the chat assistants) - Whisper
 * access is specifically a Groq strength with a generous, well-documented
 * free allowance, and neither Gemini's nor OpenRouter's free tiers have a
 * comparably solid free transcription endpoint to fall back to.
 */

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB, comfortably under Groq's 25MB free-tier cap

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return realIp ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`ai-transcribe:${ip}`, 20, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many voice requests - please wait a bit and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      logServerInfo("ai.transcribe.no_provider_configured", {});
      return NextResponse.json({ error: "Voice input isn't available right now." }, { status: 503 });
    }

    const incomingForm = await request.formData();
    const audioFile = incomingForm.get("audio");

    if (!(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio received." }, { status: 400 });
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "That recording is too long. Please keep it under a minute." }, { status: 400 });
    }

    const groqForm = new FormData();
    groqForm.set("model", process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo");
    groqForm.set("response_format", "json");
    // Re-wrap rather than pass the File through directly, so we control the
    // filename/extension Groq sees regardless of what the browser named it.
    groqForm.set("file", audioFile, `audio.${extensionFromMimeType(audioFile.type)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000); 

    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: groqForm,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      logServerInfo("ai.transcribe.provider_error", { status: response.status, body: bodyText.slice(0, 300) });
      return NextResponse.json({ error: "Couldn't transcribe that. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Didn't catch that - please try again." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    logDevError("ai.transcribe.unhandled", error);
    return NextResponse.json({ error: "Voice input failed. Please try again." }, { status: 500 });
  }
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}