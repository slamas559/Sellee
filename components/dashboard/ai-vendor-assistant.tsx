"use client";

import { useEffect, useRef, useState } from "react";
import { formatNaira } from "@/lib/format";
import { VENDOR_ASSISTANT_NAME } from "@/lib/ai/vendor-assistant-config";
import { MicButton } from "@/components/ai/mic-button";
import { SpeakButton } from "@/components/ai/speak-button";
import {
  AlertTriangle,
  MessageCircle,
  Package,
  Send,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type SalesSummary = {
  period: "today" | "7d" | "30d";
  confirmed_revenue: number;
  confirmed_orders: number;
  pending_orders: number;
};

type LowStockItem = { id: string; name: string; stock_count: number };

type VendorProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock_count: number;
  is_available: boolean;
};

type VendorOrder = {
  id: string;
  customer_name: string | null;
  status: string;
  total_amount: number;
  item_count: number;
  created_at: string;
};

type ProposedBroadcast = { message: string; target_scope: "followers" | "customers" | "all" };
type ProposedProduct = {
  name: string;
  description: string;
  category: string;
  price: number;
  stock_count: number;
};

type AssistantApiResult = {
  reply: string;
  salesSummary: SalesSummary | null;
  lowStock: LowStockItem[];
  products: VendorProduct[];
  orders: VendorOrder[];
  proposedBroadcast: ProposedBroadcast | null;
  proposedProduct: ProposedProduct | null;
};

type BroadcastCardState = {
  message: string;
  target_scope: "followers" | "customers" | "all";
  status: "idle" | "sending" | "sent" | "error";
  error?: string;
};

type ProductCardState = {
  name: string;
  description: string;
  category: string;
  price: string;
  stock_count: string;
  status: "idle" | "sending" | "sent" | "error";
  error?: string;
};

const PERIOD_LABEL: Record<SalesSummary["period"], string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const SUGGESTIONS = ["How's my store doing today?", "What's low on stock?", "Draft a restock announcement"];

function SalesSummaryCard({ summary }: { summary: SalesSummary }) {
  return (
    <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
        <TrendingUp className="h-3.5 w-3.5" /> {PERIOD_LABEL[summary.period]}
      </p>
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-black text-slate-900">{formatNaira(summary.confirmed_revenue)}</p>
          <p className="text-[10px] text-slate-500">Revenue</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">{summary.confirmed_orders}</p>
          <p className="text-[10px] text-slate-500">Confirmed</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">{summary.pending_orders}</p>
          <p className="text-[10px] text-slate-500">Pending</p>
        </div>
      </div>
    </div>
  );
}

function LowStockCard({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        No low-stock items right now.
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" /> Low stock
      </p>
      {items.map((item) => (
        <p key={item.id} className="text-xs text-slate-700">
          {item.name} <span className="text-amber-700">- {item.stock_count} left</span>
        </p>
      ))}
    </div>
  );
}

function ProductsListCard({ products }: { products: VendorProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        No matching products found.
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <Package className="h-3.5 w-3.5" /> Products
      </p>
      {products.slice(0, 8).map((product) => (
        <div key={product.id} className="flex items-center justify-between text-xs">
          <span className="line-clamp-1 text-slate-700">{product.name}</span>
          <span className="shrink-0 font-semibold text-slate-900">{formatNaira(product.price)}</span>
        </div>
      ))}
    </div>
  );
}

function OrdersListCard({ orders }: { orders: VendorOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        No matching orders found.
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <ShoppingBag className="h-3.5 w-3.5" /> Orders
      </p>
      {orders.slice(0, 8).map((order) => (
        <div key={order.id} className="flex items-center justify-between text-xs">
          <span className="line-clamp-1 text-slate-700">
            {order.customer_name ?? "Customer"} · {order.item_count} item{order.item_count === 1 ? "" : "s"}
          </span>
          <span className="shrink-0 font-semibold text-slate-900">{formatNaira(order.total_amount)}</span>
        </div>
      ))}
    </div>
  );
}

function BroadcastProposalCard({
  state,
  onChange,
  onConfirm,
}: {
  state: BroadcastCardState;
  onChange: (next: Partial<BroadcastCardState>) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="text-xs font-bold text-emerald-800">Broadcast draft - review before sending</p>
      <textarea
        value={state.message}
        onChange={(e) => onChange({ message: e.target.value })}
        disabled={state.status === "sending" || state.status === "sent"}
        maxLength={1000}
        rows={3}
        className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <select
          value={state.target_scope}
          onChange={(e) => onChange({ target_scope: e.target.value as BroadcastCardState["target_scope"] })}
          disabled={state.status === "sending" || state.status === "sent"}
          className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:opacity-60"
        >
          <option value="followers">Followers</option>
          <option value="customers">Past customers</option>
          <option value="all">Everyone</option>
        </select>
        {state.status !== "sent" ? (
          <button
            type="button"
            onClick={onConfirm}
            disabled={state.status === "sending" || !state.message.trim()}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {state.status === "sending" ? "Sending..." : "Confirm & Send"}
          </button>
        ) : (
          <span className="ml-auto text-xs font-semibold text-emerald-700">Sent ✓</span>
        )}
      </div>
      {state.status === "error" ? <p className="text-[11px] text-red-600">{state.error}</p> : null}
    </div>
  );
}

function ProductProposalCard({
  state,
  allowedCategories,
  onChange,
  onConfirm,
}: {
  state: ProductCardState;
  allowedCategories: string[];
  onChange: (next: Partial<ProductCardState>) => void;
  onConfirm: () => void;
}) {
  const locked = state.status === "sending" || state.status === "sent";

  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="text-xs font-bold text-emerald-800">New product draft - review before adding</p>
      <input
        value={state.name}
        onChange={(e) => onChange({ name: e.target.value })}
        disabled={locked}
        placeholder="Product name"
        className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 disabled:opacity-60"
      />
      <textarea
        value={state.description}
        onChange={(e) => onChange({ description: e.target.value })}
        disabled={locked}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 disabled:opacity-60"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={state.price}
          onChange={(e) => onChange({ price: e.target.value.replace(/[^0-9.]/g, "") })}
          disabled={locked}
          placeholder="Price (₦)"
          inputMode="decimal"
          className="rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 disabled:opacity-60"
        />
        <input
          value={state.stock_count}
          onChange={(e) => onChange({ stock_count: e.target.value.replace(/[^0-9]/g, "") })}
          disabled={locked}
          placeholder="Stock count"
          inputMode="numeric"
          className="rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 disabled:opacity-60"
        />
      </div>
      {allowedCategories.length > 0 ? (
        <select
          value={allowedCategories.includes(state.category) ? state.category : ""}
          onChange={(e) => onChange({ category: e.target.value })}
          disabled={locked}
          className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-700 disabled:opacity-60"
        >
          <option value="">Select category...</option>
          {allowedCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={state.category}
          onChange={(e) => onChange({ category: e.target.value })}
          disabled={locked}
          placeholder="Category (optional)"
          className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-400 disabled:opacity-60"
        />
      )}
      <div className="flex items-center">
        {state.status !== "sent" ? (
          <button
            type="button"
            onClick={onConfirm}
            disabled={locked || !state.name.trim() || !state.price}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {state.status === "sending" ? "Adding..." : "Confirm & Add"}
          </button>
        ) : (
          <span className="ml-auto text-xs font-semibold text-emerald-700">Added ✓</span>
        )}
      </div>
      {state.status === "error" ? <p className="text-[11px] text-red-600">{state.error}</p> : null}
    </div>
  );
}

export function AiVendorAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm ${VENDOR_ASSISTANT_NAME}. Ask me about your inventory, sales, or orders, or ask me to draft a broadcast or a new product listing.`,
    },
  ]);
  const [extrasByIndex, setExtrasByIndex] = useState<Record<number, Omit<AssistantApiResult, "reply">>>({});
  const [broadcastState, setBroadcastState] = useState<Record<number, BroadcastCardState>>({});
  const [productState, setProductState] = useState<Record<number, ProductCardState>>({});
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    if (!isOpen || allowedCategories.length > 0) return;
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { allowed_categories?: string[] } | null) => {
        if (data?.allowed_categories?.length) setAllowedCategories(data.allowed_categories);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/vendor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "You're chatting a little fast - please wait a moment.");
        setIsSending(false);
        return;
      }

      if (!response.ok) throw new Error("Assistant request failed");

      const data: AssistantApiResult = await response.json();

      setMessages((prev) => {
        const updated: ChatMessage[] = [...prev, { role: "assistant", content: data.reply }];
        const index = updated.length - 1;

        setExtrasByIndex((prevExtras) => ({
          ...prevExtras,
          [index]: {
            salesSummary: data.salesSummary,
            lowStock: data.lowStock,
            products: data.products,
            orders: data.orders,
            proposedBroadcast: data.proposedBroadcast,
            proposedProduct: data.proposedProduct,
          },
        }));

        if (data.proposedBroadcast) {
          setBroadcastState((prev) => ({
            ...prev,
            [index]: { ...data.proposedBroadcast!, status: "idle" },
          }));
        }
        if (data.proposedProduct) {
          setProductState((prev) => ({
            ...prev,
            [index]: {
              name: data.proposedProduct!.name,
              description: data.proposedProduct!.description,
              category: data.proposedProduct!.category,
              price: String(data.proposedProduct!.price),
              stock_count: String(data.proposedProduct!.stock_count),
              status: "idle",
            },
          }));
        }

        return updated;
      });
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function confirmBroadcast(index: number) {
    const state = broadcastState[index];
    if (!state) return;

    setBroadcastState((prev) => ({ ...prev, [index]: { ...prev[index], status: "sending", error: undefined } }));

    try {
      const response = await fetch("/api/vendor/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "now", message: state.message, target_scope: state.target_scope }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setBroadcastState((prev) => ({
          ...prev,
          [index]: { ...prev[index], status: "error", error: data?.error ?? "Could not send broadcast." },
        }));
        return;
      }

      setBroadcastState((prev) => ({ ...prev, [index]: { ...prev[index], status: "sent" } }));
    } catch {
      setBroadcastState((prev) => ({
        ...prev,
        [index]: { ...prev[index], status: "error", error: "Network error - please try again." },
      }));
    }
  }

  async function confirmProduct(index: number) {
    const state = productState[index];
    if (!state) return;

    setProductState((prev) => ({ ...prev, [index]: { ...prev[index], status: "sending", error: undefined } }));

    try {
      const formData = new FormData();
      formData.set("name", state.name);
      formData.set("description", state.description);
      formData.set("category", state.category);
      formData.set("price", state.price || "0");
      formData.set("stock_count", state.stock_count || "0");
      formData.set("is_available", "true");

      const response = await fetch("/api/products", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setProductState((prev) => ({
          ...prev,
          [index]: { ...prev[index], status: "error", error: data?.error ?? "Could not add product." },
        }));
        return;
      }

      setProductState((prev) => ({ ...prev, [index]: { ...prev[index], status: "sent" } }));
    } catch {
      setProductState((prev) => ({
        ...prev,
        [index]: { ...prev[index], status: "error", error: "Network error - please try again." },
      }));
    }
  }

  return (
    <div className="fixed bottom-15 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {isOpen ? (
        <div className="mb-3 flex h-[75vh] max-h-[620px] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-[0_28px_70px_-25px_rgba(16,185,129,0.45)]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-emerald-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{VENDOR_ASSISTANT_NAME}</p>
                <p className="text-[11px] text-emerald-700">Your store&apos;s assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              className="rounded-full p-1.5 text-slate-500 hover:bg-white hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message, index) => {
              const extras = extrasByIndex[index];
              return (
                <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[85%]" : "w-full max-w-[95%]"}>
                    <div className={message.role === "user" ? "flex justify-end" : "flex items-end gap-1"}>
                      <div
                        className={
                          message.role === "user"
                            ? "rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2 text-sm text-white"
                            : "rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-800"
                        }
                      >
                        {message.content}
                      </div>
                      {message.role === "assistant" ? <SpeakButton text={message.content} /> : null}
                    </div>

                    {extras?.salesSummary ? <SalesSummaryCard summary={extras.salesSummary} /> : null}
                    {extras?.lowStock && extras.lowStock.length > 0 ? <LowStockCard items={extras.lowStock} /> : null}
                    {extras?.products && extras.products.length > 0 ? <ProductsListCard products={extras.products} /> : null}
                    {extras?.orders && extras.orders.length > 0 ? <OrdersListCard orders={extras.orders} /> : null}

                    {broadcastState[index] ? (
                      <BroadcastProposalCard
                        state={broadcastState[index]}
                        onChange={(next) =>
                          setBroadcastState((prev) => ({ ...prev, [index]: { ...prev[index], ...next } }))
                        }
                        onConfirm={() => confirmBroadcast(index)}
                      />
                    ) : null}

                    {productState[index] ? (
                      <ProductProposalCard
                        state={productState[index]}
                        allowedCategories={allowedCategories}
                        onChange={(next) =>
                          setProductState((prev) => ({ ...prev, [index]: { ...prev[index], ...next } }))
                        }
                        onConfirm={() => confirmProduct(index)}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}

            {isSending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            ) : null}

            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your store..."
              disabled={isSending}
              maxLength={500}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:bg-white disabled:opacity-60"
            />
            <MicButton onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))} disabled={isSending} />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_18px_45px_-15px_rgba(16,185,129,0.6)] transition hover:bg-emerald-700"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}