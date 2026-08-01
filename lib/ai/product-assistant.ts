import { formatNaira } from "@/lib/format";
import { ASSISTANT_NAME } from "@/lib/ai/assistant-config";
import { logDevError, logServerInfo } from "@/lib/logger";
import {
  buildProviderList,
  callWithFailover,
  parseToolArgs,
  type ProviderMessage,
  type ToolDefinition,
} from "@/lib/ai/providers";
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
 * Multi-provider failover, retry, and malformed-tool-call handling live in
 * lib/ai/providers.ts, shared across every AI feature in the app.
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
const MAX_HISTORY_MESSAGES = 12;
const LOG_SCOPE = "ai.product_assistant";

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

const SEARCH_PRODUCTS_TOOL: ToolDefinition = {
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
};

const SEARCH_STORES_TOOL: ToolDefinition = {
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
};

const ALL_TOOLS: ToolDefinition[] = [SEARCH_PRODUCTS_TOOL, SEARCH_STORES_TOOL];

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
    logServerInfo(`${LOG_SCOPE}.no_provider_configured`, {});
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
    const result = await callWithFailover(providers, messages, { tools: ALL_TOOLS, logScope: LOG_SCOPE });
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
          logDevError(`${LOG_SCOPE}.product_search_failed`, error);
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
          logDevError(`${LOG_SCOPE}.store_search_failed`, error);
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
  const finalResult = await callWithFailover(providers, messages, { logScope: LOG_SCOPE });
  return {
    reply: finalResult?.message.content ?? FALLBACK_REPLY.reply,
    products: lastProductCards,
    stores: lastStoreCards,
  };
}