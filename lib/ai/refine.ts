import { buildProviderList, callWithFailover, type ProviderMessage } from "@/lib/ai/providers";
import { logServerInfo } from "@/lib/logger";

/**
 * Text refiner - the simplest AI feature in the app. No tools, no
 * conversation history, no confirm-before-execute flow needed: the caller
 * (a form field) already IS the confirm step, since the refined text only
 * replaces the field's value when the person clicks "Apply" in the UI.
 *
 * Reuses the same multi-provider failover as Ellie/Vee via lib/ai/providers.
 */

export type RefineKind = "product_description" | "store_hero_subtitle" | "broadcast_message";

const LOG_SCOPE = "ai.refine";
const MAX_INPUT_LENGTH = 1500;

const KIND_INSTRUCTIONS: Record<RefineKind, string> = {
  product_description:
    "This is a product description for an online marketplace listing. Make it clear, appealing, and scannable - highlight what makes the product worth buying. Keep it to 2-4 short sentences. Don't invent features, materials, or claims that weren't in the original text.",
  store_hero_subtitle:
    "This is the short tagline shown under a vendor's store name on their public storefront page. Make it punchy, welcoming, and memorable - one sentence, no more than ~20 words. Don't invent products or claims not implied by the original text.",
  broadcast_message:
    "This is a WhatsApp broadcast message a vendor is sending to their followers/customers. Make it warm, direct, and easy to read on a phone screen. Keep the core offer/announcement intact - don't invent discounts, dates, or details not in the original text.",
};

function buildSystemPrompt(kind: RefineKind): string {
  return `You improve short pieces of text for a Nigerian e-commerce platform called Sellee. ${KIND_INSTRUCTIONS[kind]}

Rules:
- Output ONLY the improved text - no preamble, no quotes around it, no explanation, no markdown.
- Keep it in the same language the input was written in.
- If the input is empty or nonsensical, output a short, generic, sensible default for this context instead of an error.
- Never add emojis unless the original text already used them.`;
}

export async function refineText(text: string, kind: RefineKind): Promise<{ refined: string } | { error: string }> {
  const trimmed = text.trim().slice(0, MAX_INPUT_LENGTH);

  const providers = buildProviderList();
  if (providers.length === 0) {
    logServerInfo(`${LOG_SCOPE}.no_provider_configured`, {});
    return { error: "AI refinement isn't available right now." };
  }

  const messages: ProviderMessage[] = [
    { role: "system", content: buildSystemPrompt(kind) },
    { role: "user", content: trimmed || "(empty)" },
  ];

  const result = await callWithFailover(providers, messages, {
    temperature: 0.5,
    maxTokens: 300,
    logScope: LOG_SCOPE,
  });

  const refined = result?.message.content?.trim();
  if (!refined) {
    return { error: "Couldn't refine that just now - please try again." };
  }

  // Strip a stray wrapping quote pair if the model added one despite
  // instructions not to - a common small-model habit.
  const unquoted = refined.replace(/^["'“]([\s\S]*)["'”]$/, "$1").trim();

  return { refined: unquoted };
}