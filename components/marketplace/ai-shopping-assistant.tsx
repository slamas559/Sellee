"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNaira, formatProductPathSegment } from "@/lib/format";
import { ASSISTANT_NAME } from "@/lib/ai/assistant-config";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantProductCard = {
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

const GREETING: ChatMessage = {
  role: "assistant",
  content: `Hi! I'm ${ASSISTANT_NAME}. Tell me what you're looking for - an item, a budget, or even just a vibe - and I'll find it for you.`,
};

const SUGGESTIONS = ["Something under ₦5,000", "Gift ideas", "What's trending?"];

function ProductMiniCard({ product }: { product: AssistantProductCard }) {
  const href = `/store/${product.store_slug}/${formatProductPathSegment(product)}?from=ai_assistant`;

  return (
    <Link
      href={href}
      className="flex shrink-0 w-36 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-24 w-full bg-slate-100">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="144px" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">No image</div>
        )}
      </div>
      <div className="space-y-0.5 p-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-900">{product.name}</p>
        <p className="text-[10px] text-slate-500">{product.store_name}</p>
        <p className="text-xs font-bold text-emerald-700">{formatNaira(product.price)}</p>
      </div>
    </Link>
  );
}

export function AiShoppingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [productsByMessageIndex, setProductsByMessageIndex] = useState<Record<number, AssistantProductCard[]>>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen, isSending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/product-chat", {
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

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const data: { reply: string; products: AssistantProductCard[] } = await response.json();

      setMessages((prev) => {
        const updated: ChatMessage[] = [...prev, { role: "assistant", content: data.reply }];
        if (data.products?.length) {
          setProductsByMessageIndex((prevProducts) => ({
            ...prevProducts,
            [updated.length - 1]: data.products,
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

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {isOpen ? (
        <div className="mb-3 flex h-[70vh] max-h-[560px] w-[90vw] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-[0_28px_70px_-25px_rgba(16,185,129,0.45)]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-emerald-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{ASSISTANT_NAME}</p>
                <p className="text-[11px] text-emerald-700">Ask me to find you something</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close shopping assistant"
              className="rounded-full p-1.5 text-slate-500 hover:bg-white hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message, index) => {
              const cards = productsByMessageIndex[index];
              return (
                <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[85%]" : "max-w-[92%]"}>
                    <div
                      className={
                        message.role === "user"
                          ? "rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2 text-sm text-white"
                          : "rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-800"
                      }
                    >
                      {message.content}
                    </div>
                    {cards?.length ? (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {cards.map((product) => (
                          <ProductMiniCard key={product.id} product={product} />
                        ))}
                      </div>
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
              placeholder="What are you looking for?"
              disabled={isSending}
              maxLength={500}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:bg-white disabled:opacity-60"
            />
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
        aria-label={isOpen ? "Close shopping assistant" : "Open shopping assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_18px_45px_-15px_rgba(16,185,129,0.6)] transition hover:bg-emerald-700"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}