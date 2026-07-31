import { formatNaira } from "@/lib/format";
import { ASSISTANT_NAME } from "@/lib/ai/assistant-config";
import { logDevError, logServerInfo } from "@/lib/logger";
import { type ProductSearchResult, searchProducts } from "@/lib/product-search";

/**
 * Customer-facing shopping assistant (marketplace chat widget).
 *
 * Same safety shape as the WhatsApp AI intent layer: the model never touches
 * the database directly. It can only call `search_products`, which runs the
 * exact same query as the public /api/products/search endpoint - so the
 * assistant can never surface anything a normal visitor couldn't already
 * find by browsing. There are no mutating tools here at all (no "add to
 * cart", no order creation) - this assistant is read-only/advisory by
 * design for v1.
 */

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantProductCard = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  store_name: string;
  store_slug: string;
  rating_avg: number;
  stock_count: number;
};

export type AssistantResult = {
  reply: string;
  products: AssistantProductCard[];
};

const MAX_TOOL_ROUNDS = 2;
const AI_TIMEOUT_MS = 12_000;
const MAX_HISTORY_MESSAGES = 12;

// Curated, factual site knowledge so the model answers "how does Sellee
// work" / "how do I become a vendor" type questions accurately instead of
// guessing. Anything not covered here (fees, commission %, specific
// policies) is deliberately NOT included - the model is told to point to
// /help or support rather than invent numbers.
const SITE_KNOWLEDGE = `
Sellee facts you can rely on:
- Sellee is a local marketplace where vendors set up a storefront and customers discover products, then continue and complete the order as a WhatsApp conversation with the vendor.
- Customer flow: search/browse the marketplace or a store page -> compare products, prices, ratings, and vendor location -> message the vendor on WhatsApp to place the order -> vendor updates order status -> customer can follow stores and leave reviews.
- To become a vendor: create an account, log in, then go to /become-vendor and complete the store setup form (store name, location, WhatsApp contact, branding). This unlocks the vendor dashboard for adding products and managing orders.
- Vendors manage their store from the dashboard, and can also handle orders, broadcasts, and quick lookups through WhatsApp commands once linked.
- Support contact: support@sellee.store or the Help Center at /help. Do not invent pricing, fees, or commission details - if asked, say you don't have exact figures and point to /help or support.
- Useful pages to reference by name when relevant: /marketplace (browse products), /vendors (browse stores), /how-it-works, /become-vendor, /help.
`;

const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, Sellee's shopping assistant, embedded in the marketplace web app. You help visitors find products from independent vendors, and answer questions about how Sellee itself works.

${SITE_KNOWLEDGE}

Behavior:
- Greetings ("hi", "hello", "hey") and small talk ("thanks", "thank you", "you're the best") get a short, warm, natural reply introducing yourself briefly if it's the first exchange - never call a tool for these.
- When someone describes what they want to buy (an item, occasion, budget, vibe), call the search_products tool - don't guess at products from memory.
- You may call search_products more than once if the first search comes back empty or you want to refine (e.g. drop a price filter that returned nothing).
- If results come back, write a short, warm, conversational summary (2-4 sentences) highlighting 2-4 of the best matches by name and price. Don't dump a raw list or repeat every field - the product cards are shown separately in the UI, so you're narrating, not listing.
- If nothing matches, say so plainly and suggest a broader search rather than inventing products.
- For questions about Sellee itself (how it works, becoming a vendor, contacting support), answer directly and briefly from the facts above - no need to call the tool, and don't invent anything not stated there.
- Prices are in Nigerian Naira. Keep replies short - this is a chat widget, not an essay.
- Never claim a product exists, is in stock, or has a specific price unless it came from a search_products result in this conversation.`;

const SEARCH_PRODUCTS_TOOL = {
  type: "function",
  function: {
    name: "search_products",
    description: "Search live product listings on the Sellee marketplace by keyword, category, and price range.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text search terms, e.g. product type, material, style, or occasion.",
        },
        category: {
          type: "string",
          description: "Optional exact category filter, only use if the user named a specific category.",
        },
        min_price: { type: "number", description: "Optional minimum price in Naira." },
        max_price: { type: "number", description: "Optional maximum price in Naira." },
        sort: {
          type: "string",
          enum: ["latest", "price_asc", "price_desc"],
          description: "How to order results. Default latest.",
        },
      },
      required: [],
    },
  },
} as const;

type ToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

type ProviderMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

function toCard(product: ProductSearchResult): AssistantProductCard {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image_url: product.image_url,
    category: product.category,
    store_name: product.store.name,
    store_slug: product.store.slug,
    rating_avg: Number(product.rating_avg ?? 0),
    stock_count: product.stock_count,
  };
}

function toModelSummary(product: ProductSearchResult) {
  return {
    id: product.id,
    name: product.name,
    price_naira: Number(product.price),
    formatted_price: formatNaira(Number(product.price)),
    category: product.category,
    store: product.store.name,
    rating_avg: product.rating_avg,
    stock_count: product.stock_count,
    in_stock: product.stock_count > 0,
  };
}

async function runToolSearch(rawArgs: string): Promise<{ cards: AssistantProductCard[]; summaries: unknown[] }> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    args = {};
  }

  const response = await searchProducts({
    q: typeof args.query === "string" ? args.query : undefined,
    category: typeof args.category === "string" ? args.category : undefined,
    min_price: typeof args.min_price === "number" ? args.min_price : undefined,
    max_price: typeof args.max_price === "number" ? args.max_price : undefined,
    sort: args.sort === "price_asc" || args.sort === "price_desc" ? args.sort : "latest",
    limit: 8,
  });

  return {
    cards: response.products.map(toCard),
    summaries: response.products.map(toModelSummary),
  };
}

async function callChatCompletions(params: {
  url: string;
  apiKey: string;
  model: string;
  messages: ProviderMessage[];
  useTools: boolean;
}): Promise<{ message: ProviderMessage } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0.4,
        max_tokens: 400,
        messages: params.messages,
        ...(params.useTools ? { tools: [SEARCH_PRODUCTS_TOOL], tool_choice: "auto" } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logServerInfo("ai.product_assistant.provider_error", {
        url: params.url,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    return message ? { message } : null;
  } catch (error) {
    logDevError("ai.product_assistant.provider_exception", error, { url: params.url });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildProviderConfig(): { url: string; apiKey: string; model: string; supportsTools: boolean } | null {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      supportsTools: true,
    };
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openRouterKey,
      // Free auto-router models don't reliably support tool calling, so the
      // OpenRouter fallback runs one search up front (see below) instead of
      // depending on the model to call a tool.
      model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
      supportsTools: false,
    };
  }

  return null;
}

function trimHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-MAX_HISTORY_MESSAGES);
}

const FALLBACK_REPLY: AssistantResult = {
  reply:
    "I'm having trouble reaching the assistant right now. Try the search bar above, or ask me again in a moment.",
  products: [],
};

// Deterministic fast path for greetings/thanks (same philosophy as the
// WhatsApp bot: handle the obvious, cheap case without ever touching the
// model, instead of relying on tool_choice "auto" to skip the search tool
// on its own - models attached to a tool tend to over-call it even on
// simple small talk).
const GREETING_PATTERNS = /^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening|sup|what'?s up)[!.? ]*$/i;
const THANKS_PATTERNS = /^(thanks|thank you|thank u|thanks a lot|thx|ty|appreciate it|appreciated|you'?re the best|nice one|cool|great|okay|ok)[!.? ]*$/i;

function matchSmallTalk(message: string): "greeting" | "thanks" | null {
  const normalized = message.trim();
  if (GREETING_PATTERNS.test(normalized)) return "greeting";
  if (THANKS_PATTERNS.test(normalized)) return "thanks";
  return null;
}

function smallTalkReply(kind: "greeting" | "thanks", isFirstExchange: boolean): string {
  if (kind === "greeting") {
    return isFirstExchange
      ? `Hi! I'm ${ASSISTANT_NAME}, Sellee's shopping assistant. Tell me what you're looking for, or ask me anything about how Sellee works.`
      : "Hey again! What can I help you find?";
  }
  return "You're welcome! Let me know if there's anything else you'd like to find.";
}

export async function getShoppingAssistantReply(history: ChatMessage[]): Promise<AssistantResult> {
  const trimmed = trimHistory(history);
  if (trimmed.length === 0) {
    return FALLBACK_REPLY;
  }

  const lastMessage = trimmed[trimmed.length - 1];
  if (lastMessage.role === "user") {
    const smallTalkKind = matchSmallTalk(lastMessage.content);
    if (smallTalkKind) {
      const isFirstExchange = trimmed.filter((m) => m.role === "user").length <= 1;
      return { reply: smallTalkReply(smallTalkKind, isFirstExchange), products: [] };
    }
  }

  const provider = buildProviderConfig();
  if (!provider) {
    logServerInfo("ai.product_assistant.no_provider_configured", {});
    return FALLBACK_REPLY;
  }

  // Provider without reliable tool support: run one heuristic search using
  // the latest user message as the query, then let the model narrate it.
  if (!provider.supportsTools) {
    const lastUserMessage = [...trimmed].reverse().find((m) => m.role === "user");
    let cards: AssistantProductCard[] = [];
    let summaries: unknown[] = [];

    if (lastUserMessage) {
      try {
        const result = await runToolSearch(JSON.stringify({ query: lastUserMessage.content }));
        cards = result.cards;
        summaries = result.summaries;
      } catch (error) {
        logDevError("ai.product_assistant.fallback_search_failed", error);
      }
    }

    const messages: ProviderMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmed.map((m) => ({ role: m.role, content: m.content }) as ProviderMessage),
      {
        role: "system",
        content: `Search results for the user's latest message: ${JSON.stringify(summaries).slice(0, 4000)}`,
      },
    ];

    const result = await callChatCompletions({ ...provider, messages, useTools: false });
    if (!result?.message?.content) {
      return { reply: FALLBACK_REPLY.reply, products: cards };
    }

    return { reply: result.message.content, products: cards };
  }

  // Provider with tool support (Groq): real tool-calling loop.
  const messages: ProviderMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...trimmed.map((m) => ({ role: m.role, content: m.content }) as ProviderMessage),
  ];

  let lastCards: AssistantProductCard[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await callChatCompletions({ ...provider, messages, useTools: true });
    if (!result) {
      return { reply: FALLBACK_REPLY.reply, products: lastCards };
    }

    const { message } = result;
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return { reply: message.content ?? FALLBACK_REPLY.reply, products: lastCards };
    }

    messages.push(message);

    for (const toolCall of toolCalls.slice(0, 2)) {
      if (toolCall.function.name !== "search_products") {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: "Unknown tool" }),
        });
        continue;
      }

      try {
        const { cards, summaries } = await runToolSearch(toolCall.function.arguments);
        lastCards = cards;
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ results: summaries }).slice(0, 6000),
        });
      } catch (error) {
        logDevError("ai.product_assistant.tool_search_failed", error);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: "Search failed, apologize and suggest trying again." }),
        });
      }
    }
  }

  // Ran out of rounds - ask once more without tools to force a final answer.
  const finalResult = await callChatCompletions({ ...provider, messages, useTools: false });
  return {
    reply: finalResult?.message?.content ?? FALLBACK_REPLY.reply,
    products: lastCards,
  };
}