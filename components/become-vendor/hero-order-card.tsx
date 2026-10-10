"use client";

import { useEffect, useState } from "react";
import { CheckCheck, ShoppingBag } from "lucide-react";
import { useReducedMotion } from "./use-reduced-motion";

const TICK_MS = 700;
const CYCLE = 15; // ticks per loop

/** A looping mock of a customer order landing in the vendor's WhatsApp chat. */
export function HeroOrderCard({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setTick((t) => (t + 1) % CYCLE), TICK_MS);
    return () => clearInterval(id);
  }, [reduced]);

  // With reduced motion, freeze on the finished conversation.
  const t = reduced ? 10 : tick;
  const showCustomer = t >= 1;
  const showTyping = t === 2 || t === 3;
  const showOrder = t >= 4;
  const showConfirm = t >= 8;
  const fading = !reduced && t >= 13;

  return (
    <div className={`w-full max-w-[300px] ${className}`}>
      <div className="bv-float-slow">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
          <div className="flex items-center gap-3 bg-emerald-700 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">Ada · Customer</p>
              <p className="text-[11px] text-emerald-100">online</p>
            </div>
            <ShoppingBag className="ml-auto h-4 w-4 text-emerald-100" />
          </div>

          <div
            className={`flex min-h-[220px] flex-col justify-end gap-2 bg-[#efeae2] p-3 transition-opacity duration-500 ${
              fading ? "opacity-0" : "opacity-100"
            }`}
          >
            {showCustomer ? (
              <div className="bv-msg-in max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
                Hi! Is the Ankara tote still available?
              </div>
            ) : null}

            {showTyping ? (
              <div className="bv-msg-in flex w-fit items-center gap-1 self-start rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
                <span className="bv-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span className="bv-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0.15s" }} />
                <span className="bv-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: "0.3s" }} />
              </div>
            ) : null}

            {showOrder ? (
              <div className="bv-msg-in max-w-[90%] self-start rounded-2xl rounded-tl-sm border-l-4 border-emerald-500 bg-white px-3 py-2 text-xs shadow-sm">
                <p className="font-bold text-emerald-700">New order · #1042</p>
                <p className="mt-0.5 text-slate-800">2 × Ankara tote</p>
                <p className="font-semibold text-slate-900">₦18,500 · Lekki, Lagos</p>
              </div>
            ) : null}

            {showConfirm ? (
              <div className="bv-msg-in flex max-w-[85%] items-end gap-1.5 self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-xs text-slate-800 shadow-sm">
                <span>Order confirmed. Delivery tomorrow.</span>
                <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-medium text-white/80">
        Orders land in the WhatsApp chat you already use.
      </p>
    </div>
  );
}
