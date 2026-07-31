import { formatNaira } from "@/lib/format";
import { ASSISTANT_NAME } from "@/lib/ai/assistant-config";
import { logDevError, logServerInfo } from "@/lib/logger";
import { type ProductSearchResult, searchProducts } from "@/lib/product-search";
import { type StoreSearchResult, searchStores } from "@/lib/store-search";

/**
 * Customer-facing shopping assistant (marketplace chat widget).
 *
 * Same safety shape as the WhatsApp AI intent layer: the model never touches
 * the database directly. It can only call `search_products` / `search_stores`,
 * which run the exact same queries as the public search APIs - so the
 * assistant can never surface anything a normal visitor couldn't already
 * find by browsing. There are no mutating tools here at all (no "add to
 * cart", no order creation, no order lookups) - this assistant is
 * read-only/advisory by design for v1.
 *
 * Multi-provider failover: free-tier LLM providers are individually
 * unreliable (rate limits, occasional malformed tool-call generations under
 * load - e.g. Groq's llama-3.3-70b-versatile sometimes wraps a tool call in
 * <function=...> tags instead of pure JSON, which the API rejects with a
 * 400 tool_use_failed). Rather than pick one provider for the whole
 * conversation, every individual API call tries each configured provider in
 * order and moves to the next on ANY failure (429, 400, timeout, network
 * error) - so one provider having a bad moment doesn't take the assistant
 * down mid-conversation.
 */

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StoreContext = {
  id: string;
  name: string;
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

export type AssistantStoreCard = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  rating_avg: number;
  rating_count: number;
  follower_count: number;
  niche_names: string[];
};

export type AssistantResult = {
  reply: string;
  products: AssistantProductCard[];
  stores: AssistantStoreCard[];
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
- Order status / tracking: you have NO access to anyone's account or order data in this chat - never guess or claim to look one up. If asked about an order's status, tell them to message the vendor directly on WhatsApp (the fastest way), or use Sellee's WhatsApp bot commands (like TRACK <order id> or MY ORDERS) if they're already linked there. Point to /help if they're not sure how to reach the vendor.
`;

const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, Sellee's shopping assistant, embedded in the marketplace web app. You help visitors find products and vendors, and answer questions about how Sellee itself works.

${SITE_KNOWLEDGE}

Behavior:
- Greetings ("hi", "hello", "hey") and small talk ("thanks", "thank you", "you're the best") get a short, warm, natural reply introducing yourself briefly if it's the first exchange - never call a tool for these.
- When someone describes what they want to buy (an item, occasion, budget, vibe), call the search_products tool - don't guess at products from memory.
- When someone asks about vendors/stores directly (e.g. "which vendors sell furniture near Yaba", "is this store trustworthy", "show me stores in Lagos"), call the search_stores tool instead. Use its rating_avg, rating_count, and follower_count fields to answer trust/popularity questions with real numbers - never vaguely reassure without them.
- You may call a search tool more than once if the first search comes back empty or you want to refine (e.g. drop a price filter that returned nothing).
- If results come back, write a short, warm, conversational summary (2-4 sentences) highlighting a few of the best matches by name (and price for products). Don't dump a raw list or repeat every field - cards are shown separately in the UI, so you're narrating, not listing.
- If nothing matches, say so plainly and suggest a broader search rather than inventing results.
- Comparing items: if the user asks you to compare products or stores you already described earlier in this same conversation, reason from what you already said (name, price, category, rating) - you don't need to search again unless they introduce something new.
- For questions about Sellee itself (how it works, becoming a vendor, contacting support, order tracking), answer directly and briefly from the facts above - no need to call a tool, and don't invent anything not stated there.
- Prices are in Nigerian Naira. Keep replies short - this is a chat widget, not an essay.
- Never claim a product/store exists, is in stock, or has a specific price/rating unless it came from a tool result in this conversation.`;

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
        search_all_stores: {
          type: "boolean",
          description:
            "Only relevant when a 'current store' context is provided below. Set true ONLY if the user explicitly asks to search other stores/everywhere/the whole marketplace. Otherwise omit or leave false to stay scoped to the current store.",
        },
      },
      required: [],
    },
  },
} as const;

const SEARCH_STORES_TOOL = {
  type: "function",
  function: {
    name: "search_stores",
    description: "Search vendor/store listings on Sellee by name, location, or the category of products they sell.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text search terms, e.g. store name, city, or state.",
        },
        category: {
          type: "string",
          description: "Optional exact product category filter - finds stores that sell products in this category.",
        },
      },
      required: [],
    },
  },
} as const;

type ToolCall = {
  id: string;
  function: { name: string; arguments: string | Record<string, unknown> };
};

type ProviderMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ProviderConfig = {
  name: string;
  url: string;
  apiKey: string;
  model: string;
};

function toProductCard(product: ProductSearchResult): AssistantProductCard {
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

function toProductModelSummary(product: ProductSearchResult) {
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

function toStoreCard(store: StoreSearchResult): AssistantStoreCard {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    logo_url: store.logo_url,
    city: store.city,
    state: store.state,
    rating_avg: Number(store.rating_avg ?? 0),
    rating_count: store.rating_count,
    follower_count: store.follower_count,
    niche_names: store.niche_names,
  };
}

function toStoreModelSummary(store: StoreSearchResult) {
  return {
    id: store.id,
    name: store.name,
    city: store.city,
    state: store.state,
    rating_avg: store.rating_avg,
    rating_count: store.rating_count,
    follower_count: store.follower_count,
    niche_names: store.niche_names,
  };
}

// Different OpenAI-compatible providers don't all serialize tool call
// arguments identically - most send a JSON-encoded string (per the OpenAI
// spec), but not every compatibility layer is guaranteed to. Handle both
// defensively rather than assuming.
function parseToolArgs(raw: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function runProductSearch(
  rawArgs: string | Record<string, unknown>,
  storeContext?: StoreContext,
): Promise<{ cards: AssistantProductCard[]; summaries: unknown[] }> {
  const args = parseToolArgs(rawArgs);

  const searchAllStores = args.search_all_stores === true;
  const scopedStoreId = storeContext && !searchAllStores ? storeContext.id : undefined;

  const response = await searchProducts({
    q: typeof args.query === "string" ? args.query : undefined,
    category: typeof args.category === "string" ? args.category : undefined,
    store_id: scopedStoreId,
    min_price: typeof args.min_price === "number" ? args.min_price : undefined,
    max_price: typeof args.max_price === "number" ? args.max_price : undefined,
    sort: args.sort === "price_asc" || args.sort === "price_desc" ? args.sort : "latest",
    limit: 8,
  });

  return {
    cards: response.products.map(toProductCard),
    summaries: response.products.map(toProductModelSummary),
  };
}

async function runStoreSearch(
  rawArgs: string | Record<string, unknown>,
): Promise<{ cards: AssistantStoreCard[]; summaries: unknown[] }> {
  const args = parseToolArgs(rawArgs);

  const response = await searchStores({
    q: typeof args.query === "string" ? args.query : undefined,
    category: typeof args.category === "string" ? args.category : undefined,
    limit: 8,
  });

  return {
    cards: response.stores.map(toStoreCard),
    summaries: response.stores.map(toStoreModelSummary),
  };
}

// Some free/open models don't reliably populate the standard OpenAI
// `tool_calls` field - instead they emit their OWN pseudo-tool-call syntax
// as plain text content (e.g. Hermes/Qwen-style
// "<tool_call>name<arg_key>...</arg_key>..." or Groq's "<function=...>").
// If that leaks through, treat it as a failed call rather than showing raw
// syntax to the user - the caller will move on to the next provider.
function looksLikeMalformedToolCallText(content: string | null | undefined): boolean {
  if (!content) return false;
  return /<tool_call>|<\/tool_call>|<function=|<arg_key>|<arg_value>/i.test(content);
}

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const attempt = async (perAttemptTimeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt(timeoutMs);
  } catch (error) {
    // One short retry for transient network-level failures (DNS hiccup, TLS
    // reset, brief connectivity blip) - not for HTTP error responses, which
    // land here as a normal `response` object, not a thrown error.
    if (error instanceof Error && error.name === "AbortError") {
      throw error; // already used the full time budget, don't retry
    }
    logServerInfo("ai.product_assistant.network_retry", { url });
    return attempt(Math.min(timeoutMs, 4_000));
  }
}

async function callChatCompletions(params: {
  provider: ProviderConfig;
  messages: ProviderMessage[];
  useTools: boolean;
}): Promise<{ message: ProviderMessage } | null> {
  try {
    const response = await fetchWithRetry(
      params.provider.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.provider.apiKey}`,
        },
        body: JSON.stringify({
          model: params.provider.model,
          temperature: 0.4,
          max_tokens: 400,
          messages: params.messages,
          ...(params.useTools ? { tools: [SEARCH_PRODUCTS_TOOL, SEARCH_STORES_TOOL], tool_choice: "auto" } : {}),
        }),
      },
      AI_TIMEOUT_MS,
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      logServerInfo("ai.product_assistant.provider_error", {
        provider: params.provider.name,
        status: response.status,
        body: bodyText.slice(0, 300),
      });
      return null;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    if (!message) return null;

    if (params.useTools && (message.tool_calls?.length ?? 0) === 0 && looksLikeMalformedToolCallText(message.content)) {
      logServerInfo("ai.product_assistant.malformed_tool_call_text", {
        provider: params.provider.name,
        snippet: String(message.content).slice(0, 200),
      });
      return null;
    }

    return { message };
  } catch (error) {
    logDevError("ai.product_assistant.provider_exception", error, { provider: params.provider.name });
    return null;
  }
}

/**
 * Tries each configured provider in order for THIS SPECIFIC call, returning
 * the first success. Called once per round of the tool loop, so a provider
 * that fails partway through a conversation doesn't take the whole
 * conversation down - the next call just tries the next provider.
 */
async function callWithFailover(
  providers: ProviderConfig[],
  messages: ProviderMessage[],
  useTools: boolean,
): Promise<{ message: ProviderMessage; providerName: string } | null> {
  for (const provider of providers) {
    const result = await callChatCompletions({ provider, messages, useTools });
    if (result) {
      return { message: result.message, providerName: provider.name };
    }
    logServerInfo("ai.product_assistant.provider_failed_trying_next", { failedProvider: provider.name });
  }
  return null;
}

function buildProviderList(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // Order matters: fastest/most reliable free tier first.
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      // Google's free-tier model naming has moved fast - if this default
      // ever 404s/400s, check the current model list in Google AI Studio
      // and override with GEMINI_MODEL.
      model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      // Auto-router to whatever :free model is currently available. Its
      // tool-calling support is the least reliable of the three, which is
      // fine here since it's only reached if both providers above failed.
      model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
    });
  }

  return providers;
}

function trimHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-MAX_HISTORY_MESSAGES);
}

function buildStoreContextMessage(storeContext: StoreContext): ProviderMessage {
  return {
    role: "system",
    content: `Current page context: the visitor is browsing the store "${storeContext.name}" (store_id: ${storeContext.id}). By default, scope search_products to this store - don't set search_all_stores unless the user clearly asks to look beyond this store (e.g. "search everywhere", "other stores", "the whole marketplace").`,
  };
}

const FALLBACK_REPLY: AssistantResult = {
  reply:
    "I'm having trouble reaching the assistant right now. Try the search bar above, or ask me again in a moment.",
  products: [],
  stores: [],
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

function smallTalkReply(kind: "greeting" | "thanks", isFirstExchange: boolean, storeContext?: StoreContext): string {
  if (kind === "greeting") {
    if (!isFirstExchange) return "Hey again! What can I help you find?";
    return storeContext
      ? `Hi! I'm ${ASSISTANT_NAME}. Happy to help you find something in ${storeContext.name}, or search the wider marketplace - just ask.`
      : `Hi! I'm ${ASSISTANT_NAME}, Sellee's shopping assistant. Tell me what you're looking for, or ask me anything about how Sellee works.`;
  }
  return "You're welcome! Let me know if there's anything else you'd like to find.";
}

export async function getShoppingAssistantReply(
  history: ChatMessage[],
  storeContext?: StoreContext,
): Promise<AssistantResult> {
  const trimmed = trimHistory(history);
  if (trimmed.length === 0) {
    return FALLBACK_REPLY;
  }

  const lastMessage = trimmed[trimmed.length - 1];
  if (lastMessage.role === "user") {
    const smallTalkKind = matchSmallTalk(lastMessage.content);
    if (smallTalkKind) {
      const isFirstExchange = trimmed.filter((m) => m.role === "user").length <= 1;
      return {
        reply: smallTalkReply(smallTalkKind, isFirstExchange, storeContext),
        products: [],
        stores: [],
      };
    }
  }

  const providers = buildProviderList();
  if (providers.length === 0) {
    logServerInfo("ai.product_assistant.no_provider_configured", {});
    return FALLBACK_REPLY;
  }

  const messages: ProviderMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(storeContext ? [buildStoreContextMessage(storeContext)] : []),
    ...trimmed.map((m) => ({ role: m.role, content: m.content }) as ProviderMessage),
  ];

  let lastProductCards: AssistantProductCard[] = [];
  let lastStoreCards: AssistantStoreCard[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await callWithFailover(providers, messages, true);
    if (!result) {
      // Every configured provider failed for this call.
      return { reply: FALLBACK_REPLY.reply, products: lastProductCards, stores: lastStoreCards };
    }

    const { message } = result;
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return { reply: message.content ?? FALLBACK_REPLY.reply, products: lastProductCards, stores: lastStoreCards };
    }

    messages.push(message);

    for (const toolCall of toolCalls.slice(0, 2)) {
      if (toolCall.function.name === "search_products") {
        try {
          const { cards, summaries } = await runProductSearch(toolCall.function.arguments, storeContext);
          lastProductCards = cards;
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ results: summaries }).slice(0, 6000),
          });
        } catch (error) {
          logDevError("ai.product_assistant.product_search_failed", error);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Search failed, apologize and suggest trying again." }),
          });
        }
        continue;
      }

      if (toolCall.function.name === "search_stores") {
        try {
          const { cards, summaries } = await runStoreSearch(toolCall.function.arguments);
          lastStoreCards = cards;
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ results: summaries }).slice(0, 6000),
          });
        } catch (error) {
          logDevError("ai.product_assistant.store_search_failed", error);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Search failed, apologize and suggest trying again." }),
          });
        }
        continue;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: "Unknown tool" }),
      });
    }
  }

  // Ran out of rounds - ask once more without tools to force a final answer.
  const finalResult = await callWithFailover(providers, messages, false);
  return {
    reply: finalResult?.message.content ?? FALLBACK_REPLY.reply,
    products: lastProductCards,
    stores: lastStoreCards,
  };
}