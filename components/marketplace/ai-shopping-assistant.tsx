"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatNaira, formatProductPathSegment } from "@/lib/format";
import { storeUrl } from "@/lib/store-url";
import { ASSISTANT_NAME } from "@/lib/ai/assistant-config";
import { MicButton } from "@/components/ai/mic-button";
import { SpeakButton } from "@/components/ai/speak-button";
import { MapPin, MessageCircle, Send, Sparkles, Store, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type StoreContext = {
  id: string;
  name: string;
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

type AssistantStoreCard = {
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

const BASE_SUGGESTIONS = ["Something under ₦5,000", "Gift ideas", "What's trending?"];
const STORE_SUGGESTIONS = ["What's popular in this store?", "Search everywhere instead"];

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

function StoreMiniCard({ store }: { store: AssistantStoreCard }) {
  const location = [store.city, store.state].filter(Boolean).join(", ");

  return (
    <Link
      href={storeUrl(store.slug)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-56 shrink-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
          {store.logo_url ? (
            <Image src={store.logo_url} alt={store.name} width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-4 w-4 text-slate-400" />
          )}
        </span>
        <p className="line-clamp-1 text-xs font-bold text-slate-900">{store.name}</p>
      </div>
      {location ? (
        <p className="flex items-center gap-1 text-[10px] text-slate-500">
          <MapPin className="h-3 w-3" /> {location}
        </p>
      ) : null}
      <p className="text-[10px] text-slate-600">
        {store.rating_count > 0 ? `${store.rating_avg.toFixed(1)}★ (${store.rating_count})` : "No ratings yet"}
        {" · "}
        {store.follower_count} follower{store.follower_count === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

function useStoreContextFromPath(): StoreContext | null {
  const pathname = usePathname();
  const slug = pathname?.match(/^\/store\/([^/]+)/)?.[1] ?? null;
  const [fetched, setFetched] = useState<{ slug: string; store: StoreContext } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    fetch(`/api/stores/${slug}/basic`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { store?: { id: string; name: string } } | null) => {
        if (cancelled || !data?.store) return;
        setFetched({ slug, store: { id: data.store.id, name: data.store.name } });
      })
      .catch(() => {
        // Swallow - falling back to "no store context" is a fine default.
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Deriving the reset-to-null case at render time (rather than an extra
  // setState call for "no slug"/"slug changed") avoids a synchronous
  // setState in the effect body and any stale-store flash when navigating
  // between two different store pages.
  return slug && fetched?.slug === slug ? fetched.store : null;
}

export function AiShoppingAssistant() {
  const storeContext = useStoreContextFromPath();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [productsByMessageIndex, setProductsByMessageIndex] = useState<Record<number, AssistantProductCard[]>>({});
  const [storesByMessageIndex, setStoresByMessageIndex] = useState<Record<number, AssistantStoreCard[]>>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastGreetingStoreId = useRef<string | null | undefined>(undefined);

  // Seed (or reseed, if store context resolves after mount) the greeting -
  // but only while the user hasn't sent a real message yet, so a slow
  // store-context fetch can never wipe an in-progress conversation.
  useEffect(() => {
    const storeKey = storeContext?.id ?? null;
    const hasUserSentMessage = messages.some((m) => m.role === "user");
    if (hasUserSentMessage || lastGreetingStoreId.current === storeKey) return;

    lastGreetingStoreId.current = storeKey;
    setMessages([
      {
        role: "assistant",
        content: storeContext
          ? `Hi! I'm ${ASSISTANT_NAME}. I'll search within ${storeContext.name} by default - just say "search everywhere" if you want the whole marketplace.`
          : `Hi! I'm ${ASSISTANT_NAME}. Tell me what you're looking for - an item, a budget, or even just a vibe - and I'll find it for you.`,
      },
    ]);
    setProductsByMessageIndex({});
    setStoresByMessageIndex({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeContext?.id]);

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
        body: JSON.stringify({
          messages: nextMessages,
          ...(storeContext ? { store: storeContext } : {}),
        }),
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

      const data: { reply: string; products: AssistantProductCard[]; stores: AssistantStoreCard[] } =
        await response.json();

      setMessages((prev) => {
        const updated: ChatMessage[] = [...prev, { role: "assistant", content: data.reply }];
        const messageIndex = updated.length - 1;

        if (data.products?.length) {
          setProductsByMessageIndex((prevProducts) => ({ ...prevProducts, [messageIndex]: data.products }));
        }
        if (data.stores?.length) {
          setStoresByMessageIndex((prevStores) => ({ ...prevStores, [messageIndex]: data.stores }));
        }
        return updated;
      });
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  const suggestions = storeContext ? STORE_SUGGESTIONS : BASE_SUGGESTIONS;

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
                <p className="line-clamp-1 text-[11px] text-emerald-700">
                  {storeContext ? `Searching in ${storeContext.name}` : "Ask me to find you something"}
                </p>
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
              const productCards = productsByMessageIndex[index];
              const storeCards = storesByMessageIndex[index];
              return (
                <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[85%]" : "max-w-[92%]"}>
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
                    {productCards?.length ? (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {productCards.map((product) => (
                          <ProductMiniCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : null}
                    {storeCards?.length ? (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {storeCards.map((store) => (
                          <StoreMiniCard key={store.id} store={store} />
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
                {suggestions.map((suggestion) => (
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
              placeholder={storeContext ? `Search in ${storeContext.name}...` : "What are you looking for?"}
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
        aria-label={isOpen ? "Close shopping assistant" : "Open shopping assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_18px_45px_-15px_rgba(16,185,129,0.6)] transition hover:bg-emerald-700"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}