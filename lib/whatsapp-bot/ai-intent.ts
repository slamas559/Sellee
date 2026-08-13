import { z } from "zod";
import { logDevError, logServerInfo } from "@/lib/logger";
import { inferCommand } from "@/lib/whatsapp-bot/parse";

/**
 * AI Intent Layer (Sprint D)
 * --------------------------
 * This module NEVER executes anything by itself. Its only job is to translate a
 * free-form WhatsApp message into one line of Sellee's existing canonical
 * command syntax (e.g. "TRACK ABCD1234", "SEARCH rice", "LIST ORDERS").
 *
 * That canonical line is then re-validated by `inferCommand` (the same
 * deterministic parser already used everywhere else) before the router acts
 * on it. If the model is unavailable, times out, or returns something that
 * doesn't match a known command, we return `null` and the caller falls back
 * to the existing HELP message behavior. The AI can only ever narrow a
 * message down to a command Sellee already knows how to run safely - it can
 * never invent a new action.
 */

const AI_CLASSIFICATION_TIMEOUT_MS = 6_000;

const aiResultSchema = z.object({
  canonical: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

type AiResult = z.infer<typeof aiResultSchema>;

const SYSTEM_PROMPT = `You translate a WhatsApp message sent to an e-commerce bot called Sellee into ONE canonical command line the bot already understands. You never invent new commands and you never answer the user directly.

Known canonical commands (choose the closest match, fill in <..> from the message):
- HELP
- LIST ORDERS                (vendor: view recent orders)
- SALES TODAY                (vendor: today's revenue)
- LOW STOCK                  (vendor: products needing restock)
- CONFIRM <ref>              (vendor: approve an order)
- REJECT <ref>               (vendor: decline an order)
- DELIVERED <ref>            (vendor: mark an order delivered)
- BROADCAST <message>        (vendor: send a promo to followers)
- BROADCAST STATUS           (vendor: see last campaign results)
- MY ORDERS                  (customer: recent orders)
- MY STATUS                  (customer: quick status snapshot)
- TRACK <ref>                (customer: details for one order)
- CANCEL <ref>                (customer: cancel a pending order)
- SEARCH <product>           (customer: find a product)
- FOLLOW <store>             (customer: get updates from a store)
- UNFOLLOW <store>           (customer: stop updates from a store)
- MY FOLLOWS                 (customer: list followed stores)

Rules:
- Reply with ONLY a JSON object: {"canonical": string | null, "confidence": "high" | "medium" | "low"}
- "canonical" must be one of the exact command shapes above, or null if nothing fits.
- Use <ref>/<store>/<message> exactly as the user wrote it (don't translate, don't summarize).
- For SEARCH <product>: extract ONLY the product/item name as short keywords - 1 to 4 words, no
  filler ("is there", "do you have", "any", "available"), no question marks, no price or budget
  clauses ("under 700,000 naira", "below 50k"). Example: "is there any apple watch available?" -> "SEARCH apple watch". Example: "can you help me find a gaming laptop under 700,000 naira?" -> "SEARCH gaming laptop".
- If the message asks for two different things, or you are not reasonably sure, return {"canonical": null, "confidence": "low"}.
- Never output anything except that JSON object. No prose, no markdown fences.`;

function buildUserPrompt(message: string): string {
  return `Message: "${message.replace(/"/g, "'").slice(0, 500)}"`;
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function parseAiJson(raw: string): AiResult | null {
  try {
    const parsed = JSON.parse(extractJsonText(raw));
    const validated = aiResultSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

async function callChatCompletions(params: {
  url: string;
  apiKey: string;
  model: string;
  message: string;
}): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_CLASSIFICATION_TIMEOUT_MS);

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(params.message) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logServerInfo("whatsapp.ai_intent.provider_error", {
        url: params.url,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content ?? null;
  } catch (error) {
    logDevError("whatsapp.ai_intent.provider_exception", error, { url: params.url });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function classifyWithGroq(message: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  return callChatCompletions({
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    message,
  });
}

async function classifyWithOpenRouter(message: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  return callChatCompletions({
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey,
    // openrouter/free auto-routes to whatever :free model is currently
    // available, so we don't hardcode a model id that could get delisted.
    model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
    message,
  });
}

/**
 * Classifies a message that the deterministic parser could not match.
 * Returns a canonical command string only if it re-validates against
 * `inferCommand`, so the AI can never route to something outside the
 * existing, already-safe command set.
 */
export async function classifyIntentWithAI(rawMessage: string): Promise<string | null> {
  const message = rawMessage.trim();
  if (!message || message.length > 500) return null;

  const rawContent =
    (await classifyWithGroq(message)) ?? (await classifyWithOpenRouter(message));

  if (!rawContent) {
    logServerInfo("whatsapp.ai_intent.no_provider_response", {
      message: message.slice(0, 120),
    });
    return null;
  }

  const parsed = parseAiJson(rawContent);
  if (!parsed || !parsed.canonical || parsed.confidence === "low") {
    return null;
  }

  const revalidated = inferCommand(parsed.canonical);
  if (revalidated === "UNKNOWN" || revalidated === "AMBIGUOUS") {
    logServerInfo("whatsapp.ai_intent.rejected_output", {
      original: message.slice(0, 120),
      canonical: parsed.canonical,
    });
    return null;
  }

  logServerInfo("whatsapp.ai_intent.classified", {
    original: message.slice(0, 120),
    canonical: parsed.canonical,
    confidence: parsed.confidence,
  });

  return parsed.canonical;
}