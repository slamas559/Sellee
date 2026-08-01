import { formatNaira } from "@/lib/format";
import { VENDOR_ASSISTANT_NAME } from "@/lib/ai/vendor-assistant-config";
import { logDevError, logServerInfo } from "@/lib/logger";
import {
  buildProviderList,
  callWithFailover,
  parseToolArgs,
  type ProviderMessage,
  type ToolDefinition,
} from "@/lib/ai/providers";
import {
  type LowStockItem,
  type SalesPeriod,
  type SalesSummary,
  type VendorOrderSummary,
  type VendorProductSummary,
  getVendorLowStock,
  getVendorRecentOrders,
  getVendorSalesSummary,
  searchVendorProducts,
} from "@/lib/vendor-insights";

/**
 * Vendor dashboard assistant ("Vee").
 *
 * Same safety architecture as the customer-facing shopping assistant
 * (multi-provider failover, malformed-tool-call detection, deterministic
 * small-talk fast path - all shared via lib/ai/providers.ts). Two key
 * differences from Ellie:
 *
 * 1. Every read tool operates on a `storeId` that the CALLER (the API
 *    route) has already resolved server-side from the authenticated
 *    session - it is never taken from the client or from anything the
 *    model outputs, so there is no path for a vendor to see another
 *    vendor's data by asking Vee cleverly.
 * 2. The two mutating capabilities (sending a broadcast, adding a product)
 *    are NOT tools that touch the database. `propose_broadcast` and
 *    `propose_product` just return a normalized, validated draft back to
 *    the UI. The actual send/create only happens when the vendor clicks a
 *    real confirm button in the widget, which calls Sellee's existing
 *    authenticated /api/vendor/broadcasts and /api/products endpoints
 *    directly - Vee never has write access, full stop.
 */

export type VendorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type VendorStoreContext = {
  id: string;
  name: string;
};

export type ProposedBroadcast = {
  message: string;
  target_scope: "followers" | "customers" | "all";
};

export type ProposedProduct = {
  name: string;
  description: string;
  category: string;
  price: number;
  stock_count: number;
};

export type VendorAssistantResult = {
  reply: string;
  salesSummary: SalesSummary | null;
  lowStock: LowStockItem[];
  products: VendorProductSummary[];
  orders: VendorOrderSummary[];
  proposedBroadcast: ProposedBroadcast | null;
  proposedProduct: ProposedProduct | null;
};

const MAX_TOOL_ROUNDS = 2;
const MAX_HISTORY_MESSAGES = 12;
const LOG_SCOPE = "ai.vendor_assistant";

// Verified against the actual dashboard - don't add anything here that
// hasn't been confirmed to exist (e.g. there is no coupon/discount system).
const DASHBOARD_KNOWLEDGE = `
Sellee vendor dashboard facts you can rely on:
- Dashboard sections: Overview, Products, Orders, Analytics, Integrations (WhatsApp bot linking + broadcasts), Store settings, Account.
- Products page: add/edit/delete products, set price, stock, category, availability, and photos.
- Orders page: view and manage incoming orders (statuses: pending_whatsapp, confirmed, processing, shipped, delivered, cancelled, rejected).
- Integrations page: link the store's WhatsApp number to the Sellee bot, and send/schedule broadcast messages to followers/customers/everyone.
- Analytics page: sales and order trends over time.
- Order fulfillment happens as a WhatsApp conversation between the vendor and customer once an order comes in.
- You do not have access to pricing/fee/commission details - if asked, say you don't have exact figures.
`;

const SYSTEM_PROMPT = `You are ${VENDOR_ASSISTANT_NAME}, the assistant inside a Sellee vendor's dashboard. You help the vendor understand their store's inventory, sales, and orders, and help them draft (never send) broadcasts and new product listings.

${DASHBOARD_KNOWLEDGE}

Behavior:
- Greetings and small talk get a short, warm reply - never call a tool for these.
- For inventory/stock/sales/order questions, call the matching tool (get_sales_summary, get_low_stock, search_my_products, get_recent_orders) - never guess numbers from memory.
- You may call more than one tool in a conversation if it helps answer fully (e.g. sales summary AND low stock for a "how's my store doing" question).
- If the vendor wants to message their customers/followers (a promo, restock announcement, sale), call propose_broadcast with a drafted message. Do NOT claim it was sent - it only becomes a real broadcast when the vendor confirms in the UI. Mention they'll get a chance to review and edit it.
- If the vendor wants to add a new product ("add a red ankara gown, 15000 naira, 10 in stock"), call propose_product with what they told you, filling in reasonable defaults only where harmless (e.g. leave description empty if not given). Do NOT claim it was added - it only becomes a real listing when the vendor confirms in the UI.
- You have NO ability to edit or delete existing products/orders, change prices, issue refunds, or do anything else beyond the tools listed. If asked for something outside this list, say so plainly and point to the relevant dashboard page.
- For "how do I..." dashboard questions, answer directly from the facts above - no tool needed.
- Prices are in Nigerian Naira. Keep replies short and practical - this is a dashboard chat widget, not a report.
- Never state a specific number (revenue, stock count, order count) unless it came from a tool result in this conversation.`;

const GET_SALES_SUMMARY_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_sales_summary",
    description: "Get confirmed revenue and order counts for the vendor's own store over a time period.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "7d", "30d"], description: "Time window. Default today." },
      },
      required: [],
    },
  },
};

const GET_LOW_STOCK_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_low_stock",
    description: "List the vendor's own products that are low on stock (2 or fewer units) and currently available.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const SEARCH_MY_PRODUCTS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "search_my_products",
    description: "Search the vendor's own product catalogue by name/category keyword.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search terms." },
        category: { type: "string", description: "Optional exact category filter." },
      },
      required: [],
    },
  },
};

const GET_RECENT_ORDERS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_recent_orders",
    description: "List the vendor's own recent orders, optionally filtered by status.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending_whatsapp", "confirmed", "processing", "shipped", "delivered", "cancelled", "rejected", "all"],
          description: "Filter by order status. Default all.",
        },
        limit: { type: "number", description: "Max orders to return. Default 10." },
      },
      required: [],
    },
  },
};

const PROPOSE_BROADCAST_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "propose_broadcast",
    description:
      "Draft a WhatsApp broadcast message for the vendor to review and send. Does NOT send anything - only creates a draft the vendor must confirm.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "The drafted broadcast message text." },
        target_scope: {
          type: "string",
          enum: ["followers", "customers", "all"],
          description: "Who to send to. Default followers.",
        },
      },
      required: ["message"],
    },
  },
};

const PROPOSE_PRODUCT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "propose_product",
    description:
      "Draft a new product listing for the vendor to review and add. Does NOT create anything - only creates a draft the vendor must confirm.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Product name." },
        description: { type: "string", description: "Optional short product description." },
        category: { type: "string", description: "Optional category, if the vendor mentioned one." },
        price: { type: "number", description: "Price in Naira." },
        stock_count: { type: "number", description: "Units in stock." },
      },
      required: ["name", "price", "stock_count"],
    },
  },
};

const ALL_TOOLS: ToolDefinition[] = [
  GET_SALES_SUMMARY_TOOL,
  GET_LOW_STOCK_TOOL,
  SEARCH_MY_PRODUCTS_TOOL,
  GET_RECENT_ORDERS_TOOL,
  PROPOSE_BROADCAST_TOOL,
  PROPOSE_PRODUCT_TOOL,
];

function trimHistory(history: VendorChatMessage[]): VendorChatMessage[] {
  return history.slice(-MAX_HISTORY_MESSAGES);
}

function buildStoreContextMessage(store: VendorStoreContext): ProviderMessage {
  return {
    role: "system",
    content: `The authenticated vendor's store is "${store.name}" (store_id: ${store.id}). All tool results are already scoped to this store server-side - you never need to (and cannot) specify a store_id yourself.`,
  };
}

function emptyResult(reply: string): VendorAssistantResult {
  return {
    reply,
    salesSummary: null,
    lowStock: [],
    products: [],
    orders: [],
    proposedBroadcast: null,
    proposedProduct: null,
  };
}

const FALLBACK_REPLY =
  "I'm having trouble reaching the assistant right now. Please try again in a moment.";

const GREETING_PATTERNS = /^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening|sup|what'?s up)[!.? ]*$/i;
const THANKS_PATTERNS = /^(thanks|thank you|thank u|thanks a lot|thx|ty|appreciate it|appreciated|you'?re the best|nice one|cool|great|okay|ok)[!.? ]*$/i;

function matchSmallTalk(message: string): "greeting" | "thanks" | null {
  const normalized = message.trim();
  if (GREETING_PATTERNS.test(normalized)) return "greeting";
  if (THANKS_PATTERNS.test(normalized)) return "thanks";
  return null;
}

function smallTalkReply(kind: "greeting" | "thanks", isFirstExchange: boolean, store: VendorStoreContext): string {
  if (kind === "greeting") {
    if (!isFirstExchange) return "Hey again! What can I help with?";
    return `Hi! I'm ${VENDOR_ASSISTANT_NAME}. Ask me about ${store.name}'s inventory, sales, or orders, or ask me to draft a broadcast or a new product listing.`;
  }
  return "You're welcome! Anything else you'd like to check?";
}

function normalizeProposedBroadcast(rawArgs: string | Record<string, unknown>): ProposedBroadcast | null {
  const args = parseToolArgs(rawArgs);
  const message = typeof args.message === "string" ? args.message.trim() : "";
  if (!message || message.length < 3) return null;

  const scope = args.target_scope;
  const target_scope: ProposedBroadcast["target_scope"] =
    scope === "customers" || scope === "all" ? scope : "followers";

  return { message: message.slice(0, 1000), target_scope };
}

function normalizeProposedProduct(rawArgs: string | Record<string, unknown>): ProposedProduct | null {
  const args = parseToolArgs(rawArgs);
  const name = typeof args.name === "string" ? args.name.trim() : "";
  const price = typeof args.price === "number" ? args.price : Number(args.price);
  const stockCount = typeof args.stock_count === "number" ? args.stock_count : Number(args.stock_count);

  if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stockCount) || stockCount < 0) {
    return null;
  }

  return {
    name: name.slice(0, 120),
    description: typeof args.description === "string" ? args.description.trim().slice(0, 500) : "",
    category: typeof args.category === "string" ? args.category.trim().slice(0, 50) : "",
    price,
    stock_count: Math.round(stockCount),
  };
}

export async function getVendorAssistantReply(
  history: VendorChatMessage[],
  store: VendorStoreContext,
): Promise<VendorAssistantResult> {
  const trimmed = trimHistory(history);
  if (trimmed.length === 0) {
    return emptyResult(FALLBACK_REPLY);
  }

  const lastMessage = trimmed[trimmed.length - 1];
  if (lastMessage.role === "user") {
    const smallTalkKind = matchSmallTalk(lastMessage.content);
    if (smallTalkKind) {
      const isFirstExchange = trimmed.filter((m) => m.role === "user").length <= 1;
      return emptyResult(smallTalkReply(smallTalkKind, isFirstExchange, store));
    }
  }

  const providers = buildProviderList();
  if (providers.length === 0) {
    logServerInfo(`${LOG_SCOPE}.no_provider_configured`, {});
    return emptyResult(FALLBACK_REPLY);
  }

  const messages: ProviderMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    buildStoreContextMessage(store),
    ...trimmed.map((m) => ({ role: m.role, content: m.content }) as ProviderMessage),
  ];

  const accumulated = emptyResult("");

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await callWithFailover(providers, messages, { tools: ALL_TOOLS, temperature: 0.3, logScope: LOG_SCOPE });
    if (!result) {
      return { ...accumulated, reply: FALLBACK_REPLY };
    }

    const { message } = result;
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return { ...accumulated, reply: message.content ?? FALLBACK_REPLY };
    }

    messages.push(message);

    for (const toolCall of toolCalls.slice(0, 3)) {
      const name = toolCall.function.name;
      try {
        if (name === "get_sales_summary") {
          const args = parseToolArgs(toolCall.function.arguments);
          const period: SalesPeriod = args.period === "7d" || args.period === "30d" ? args.period : "today";
          const summary = await getVendorSalesSummary(store.id, period);
          accumulated.salesSummary = summary;
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(summary) });
          continue;
        }

        if (name === "get_low_stock") {
          const items = await getVendorLowStock(store.id);
          accumulated.lowStock = items;
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ items }) });
          continue;
        }

        if (name === "search_my_products") {
          const args = parseToolArgs(toolCall.function.arguments);
          const products = await searchVendorProducts(store.id, {
            query: typeof args.query === "string" ? args.query : undefined,
            category: typeof args.category === "string" ? args.category : undefined,
          });
          accumulated.products = products;
          const summaries = products.map((p) => ({
            ...p,
            formatted_price: formatNaira(Number(p.price)),
          }));
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ products: summaries }) });
          continue;
        }

        if (name === "get_recent_orders") {
          const args = parseToolArgs(toolCall.function.arguments);
          const orders = await getVendorRecentOrders(store.id, {
            status: typeof args.status === "string" ? args.status : undefined,
            limit: typeof args.limit === "number" ? args.limit : undefined,
          });
          accumulated.orders = orders;
          const summaries = orders.map((o) => ({ ...o, formatted_total: formatNaira(o.total_amount) }));
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ orders: summaries }) });
          continue;
        }

        if (name === "propose_broadcast") {
          const proposal = normalizeProposedBroadcast(toolCall.function.arguments);
          accumulated.proposedBroadcast = proposal;
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: proposal
              ? JSON.stringify({ drafted: proposal, note: "Draft created - NOT sent. Tell the vendor to review it in the UI." })
              : JSON.stringify({ error: "Could not draft that - ask the vendor for a clearer message." }),
          });
          continue;
        }

        if (name === "propose_product") {
          const proposal = normalizeProposedProduct(toolCall.function.arguments);
          accumulated.proposedProduct = proposal;
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: proposal
              ? JSON.stringify({ drafted: proposal, note: "Draft created - NOT added yet. Tell the vendor to review it in the UI." })
              : JSON.stringify({ error: "Could not draft that - ask the vendor for a name, price, and stock count." }),
          });
          continue;
        }

        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: "Unknown tool" }) });
      } catch (error) {
        logDevError(`${LOG_SCOPE}.tool_failed`, error, { tool: name });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: "That lookup failed, apologize and suggest trying again." }),
        });
      }
    }
  }

  const finalResult = await callWithFailover(providers, messages, { logScope: LOG_SCOPE });
  return { ...accumulated, reply: finalResult?.message.content ?? FALLBACK_REPLY };
}